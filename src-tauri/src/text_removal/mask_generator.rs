// 掩码生成器
// 根据检测到的文本区域生成掩码图

use super::gemini_detector::TextRegion;
use image::{GrayImage, ImageBuffer, Luma};

/// 生成掩码图（支持 polygon 和 box_2d）
/// 坐标使用 0-1000 的归一化值
pub fn generate_mask(regions: &[TextRegion], width: u32, height: u32, dilation: u32) -> GrayImage {
    let mut mask: GrayImage = ImageBuffer::new(width, height);

    for region in regions {
        // 优先使用 polygon
        if region.polygon.len() >= 3 {
            // 转换多边形坐标
            let points: Vec<(i32, i32)> = region.polygon.iter()
                .filter(|p| p.len() >= 2)
                .map(|p| {
                    // polygon 格式是 [[y1,x1], [y2,x2], ...]
                    let x = ((p[1] as f32 / 1000.0) * width as f32) as i32;
                    let y = ((p[0] as f32 / 1000.0) * height as f32) as i32;
                    (x, y)
                })
                .collect();

            if points.len() >= 3 {
                fill_polygon(&mut mask, &points);
                continue;
            }
        }

        // 回退到 box_2d [ymin, xmin, ymax, xmax]
        let [ymin, xmin, ymax, xmax] = region.box_2d;

        let x0 = ((xmin as f32 / 1000.0) * width as f32) as i32;
        let y0 = ((ymin as f32 / 1000.0) * height as f32) as i32;
        let x1 = ((xmax as f32 / 1000.0) * width as f32) as i32;
        let y1 = ((ymax as f32 / 1000.0) * height as f32) as i32;

        for y in y0.max(0)..y1.min(height as i32) {
            for x in x0.max(0)..x1.min(width as i32) {
                mask.put_pixel(x as u32, y as u32, Luma([255u8]));
            }
        }
    }

    // 膨胀掩码
    if dilation > 0 {
        dilate_mask(&mask, dilation)
    } else {
        mask
    }
}

/// 简单多边形填充（扫描线算法）
fn fill_polygon(mask: &mut GrayImage, points: &[(i32, i32)]) {
    if points.is_empty() {
        return;
    }

    let (width, height) = mask.dimensions();
    let min_y = points.iter().map(|p| p.1).min().unwrap().max(0);
    let max_y = points.iter().map(|p| p.1).max().unwrap().min(height as i32 - 1);

    for y in min_y..=max_y {
        let mut intersections = Vec::new();

        for i in 0..points.len() {
            let j = (i + 1) % points.len();
            let (x1, y1) = points[i];
            let (x2, y2) = points[j];

            if (y1 <= y && y < y2) || (y2 <= y && y < y1) {
                let x = x1 + (y - y1) * (x2 - x1) / (y2 - y1).max(1);
                intersections.push(x);
            }
        }

        intersections.sort();

        for chunk in intersections.chunks(2) {
            if chunk.len() == 2 {
                let x_start = chunk[0].max(0) as u32;
                let x_end = (chunk[1].min(width as i32 - 1) as u32).min(width - 1);
                for x in x_start..=x_end {
                    mask.put_pixel(x, y as u32, Luma([255u8]));
                }
            }
        }
    }

    // 绘制多边形边框确保边界被填充
    for i in 0..points.len() {
        let (x1, y1) = points[i];
        let (x2, y2) = points[(i + 1) % points.len()];
        draw_line(mask, x1, y1, x2, y2);
    }
}

/// 绘制直线（Bresenham 算法）
fn draw_line(mask: &mut GrayImage, x1: i32, y1: i32, x2: i32, y2: i32) {
    let width = mask.width() as i32;
    let height = mask.height() as i32;

    let dx = (x2 - x1).abs();
    let dy = -(y2 - y1).abs();
    let sx = if x1 < x2 { 1 } else { -1 };
    let sy = if y1 < y2 { 1 } else { -1 };
    let mut err = dx + dy;

    let mut x = x1;
    let mut y = y1;

    loop {
        if x >= 0 && x < width && y >= 0 && y < height {
            mask.put_pixel(x as u32, y as u32, Luma([255u8]));
        }

        if x == x2 && y == y2 {
            break;
        }

        let e2 = 2 * err;
        if e2 >= dy {
            err += dy;
            x += sx;
        }
        if e2 <= dx {
            err += dx;
            y += sy;
        }
    }
}

/// 圆形结构元素膨胀（半径为像素）
fn dilate_mask(mask: &GrayImage, radius: u32) -> GrayImage {
    if radius == 0 {
        return mask.clone();
    }

    let (width, height) = mask.dimensions();
    let mut out: GrayImage = ImageBuffer::new(width, height);
    let r = radius as i32;
    let r2 = r * r;

    let mut offsets = Vec::new();
    for dy in -r..=r {
        for dx in -r..=r {
            if dx * dx + dy * dy <= r2 {
                offsets.push((dx, dy));
            }
        }
    }

    for y in 0..height {
        for x in 0..width {
            if mask.get_pixel(x, y)[0] == 0 {
                continue;
            }
            let xi = x as i32;
            let yi = y as i32;
            for (dx, dy) in &offsets {
                let nx = xi + dx;
                let ny = yi + dy;
                if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                    out.put_pixel(nx as u32, ny as u32, Luma([255u8]));
                }
            }
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_mask_with_box() {
        let regions = vec![TextRegion {
            box_2d: [100, 100, 200, 300],  // ymin, xmin, ymax, xmax (0-1000)
            label: "测试".to_string(),
            polygon: vec![],
        }];

        let mask = generate_mask(&regions, 1000, 1000, 0);

        // 检查掩码中心点是否为白色
        assert_eq!(mask.get_pixel(200, 150)[0], 255);
        // 检查掩码外部是否为黑色
        assert_eq!(mask.get_pixel(50, 50)[0], 0);
    }
}
