// 自适应背景修复器

use super::gemini_detector::TextRegion;
use super::mask_generator::generate_mask;
use image::{GrayImage, ImageBuffer, Luma, Rgb, RgbImage};
use std::cmp::{max, min};

#[derive(Debug, Clone)]
struct Sample {
    color: [u8; 3],
}

enum BackgroundStrategy {
    Solid { color: [u8; 3] },
    Gradient { fallback_color: [u8; 3] },
}

pub fn adaptive_inpaint(
    image: &RgbImage,
    regions: &[TextRegion],
) -> Result<RgbImage, String> {
    let mut result = image.clone();
    let (width, height) = result.dimensions();

    for region in regions {
        let base_mask = generate_mask(std::slice::from_ref(region), width, height, 0);
        if is_mask_empty(&base_mask) {
            continue;
        }

        let area = count_mask_pixels(&base_mask);
        let (_mask_min_x, _mask_max_x, mask_min_y, mask_max_y) = match mask_bbox(&base_mask) {
            Some(v) => v,
            None => continue,
        };
        let mask_height = mask_max_y.saturating_sub(mask_min_y) + 1;

        let border_samples = collect_border_samples(&result, &base_mask, 8);
        let strategy = analyze_background(&border_samples);

        let size_dilate = if mask_height <= 18 {
            4
        } else if mask_height <= 28 {
            3
        } else if area < 1000 {
            3
        } else if area < 5000 {
            4
        } else {
            6
        };
        let dilate_px = size_dilate;
        let region_mask = if dilate_px > 0 {
            dilate_mask(&base_mask, dilate_px)
        } else {
            base_mask.clone()
        };

        let feather_px = max(1, dilate_px / 2);
        let mask_feather = gaussian_blur_mask(&region_mask, feather_px);

        match strategy {
            BackgroundStrategy::Solid { color } => {
                let filled = fill_solid(&result, &region_mask, color);
                blend_into(&mut result, &filled, &mask_feather);
            }
            BackgroundStrategy::Gradient { fallback_color } => {
                let filled = fill_gradient(&result, &region_mask, fallback_color);
                blend_into(&mut result, &filled, &mask_feather);
            }
        }
    }

    Ok(result)
}

fn is_mask_empty(mask: &GrayImage) -> bool {
    mask.pixels().all(|p| p[0] == 0)
}

fn count_mask_pixels(mask: &GrayImage) -> u32 {
    mask.pixels().filter(|p| p[0] > 0).count() as u32
}

fn mask_bbox(mask: &GrayImage) -> Option<(u32, u32, u32, u32)> {
    let (width, height) = mask.dimensions();
    let mut min_x = width;
    let mut min_y = height;
    let mut max_x = 0;
    let mut max_y = 0;
    let mut found = false;

    for y in 0..height {
        for x in 0..width {
            if mask.get_pixel(x, y)[0] > 0 {
                found = true;
                min_x = min(min_x, x);
                min_y = min(min_y, y);
                max_x = max(max_x, x);
                max_y = max(max_y, y);
            }
        }
    }

    if found {
        Some((min_x, max_x, min_y, max_y))
    } else {
        None
    }
}

fn collect_border_samples(
    image: &RgbImage,
    mask: &GrayImage,
    border_width: u32,
) -> Vec<Sample> {
    let (width, height) = mask.dimensions();
    let Some((min_x, max_x, min_y, max_y)) = mask_bbox(mask) else {
        return vec![];
    };

    let dilated = if border_width > 0 {
        dilate_mask(mask, border_width)
    } else {
        mask.clone()
    };

    let x0 = min_x.saturating_sub(border_width);
    let y0 = min_y.saturating_sub(border_width);
    let x1 = min(max_x + border_width, width - 1);
    let y1 = min(max_y + border_width, height - 1);

    let mut samples = Vec::new();
    for y in y0..=y1 {
        for x in x0..=x1 {
            if dilated.get_pixel(x, y)[0] > 0 && mask.get_pixel(x, y)[0] == 0 {
                let p = image.get_pixel(x, y);
                samples.push(Sample {
                    color: [p[0], p[1], p[2]],
                });
            }
        }
    }

    samples
}

fn analyze_background(samples: &[Sample]) -> BackgroundStrategy {
    if samples.is_empty() {
        return BackgroundStrategy::Solid {
            color: [255, 255, 255],
        };
    }

    let median = median_color(samples);
    if samples.len() < 10 {
        return BackgroundStrategy::Solid { color: median };
    }

    let mut mean = [0f64; 3];
    for s in samples {
        mean[0] += s.color[0] as f64;
        mean[1] += s.color[1] as f64;
        mean[2] += s.color[2] as f64;
    }
    let n = samples.len() as f64;
    mean[0] /= n;
    mean[1] /= n;
    mean[2] /= n;

    let mut var = [0f64; 3];
    for s in samples {
        var[0] += (s.color[0] as f64 - mean[0]).powi(2);
        var[1] += (s.color[1] as f64 - mean[1]).powi(2);
        var[2] += (s.color[2] as f64 - mean[2]).powi(2);
    }
    var[0] /= n;
    var[1] /= n;
    var[2] /= n;

    let variance = (var[0] + var[1] + var[2]) / 3.0;

    if variance < 5000.0 {
        return BackgroundStrategy::Solid { color: median };
    }

    BackgroundStrategy::Gradient {
        fallback_color: median,
    }
}

fn median_color(samples: &[Sample]) -> [u8; 3] {
    let mut r: Vec<u8> = samples.iter().map(|s| s.color[0]).collect();
    let mut g: Vec<u8> = samples.iter().map(|s| s.color[1]).collect();
    let mut b: Vec<u8> = samples.iter().map(|s| s.color[2]).collect();
    r.sort_unstable();
    g.sort_unstable();
    b.sort_unstable();
    let mid = samples.len() / 2;
    [r[mid], g[mid], b[mid]]
}

fn fill_solid(base: &RgbImage, mask: &GrayImage, color: [u8; 3]) -> RgbImage {
    let mut filled = base.clone();
    let (width, height) = base.dimensions();
    for y in 0..height {
        for x in 0..width {
            if mask.get_pixel(x, y)[0] > 0 {
                filled.put_pixel(x, y, Rgb(color));
            }
        }
    }
    filled
}

fn fill_gradient(base: &RgbImage, mask: &GrayImage, fallback_color: [u8; 3]) -> RgbImage {
    let mut filled = base.clone();
    let (width, height) = base.dimensions();
    let Some((min_x, max_x, min_y, max_y)) = mask_bbox(mask) else {
        return filled;
    };

    let pad = 5i32;
    let x_min = min_x as i32;
    let x_max = max_x as i32;
    let y_min = min_y as i32;
    let y_max = max_y as i32;

    let x_min_ext = (x_min - pad).max(0);
    let x_max_ext = (x_max + pad).min(width as i32 - 1);
    let y_min_ext = (y_min - pad).max(0);
    let y_max_ext = (y_max + pad).min(height as i32 - 1);

    let left_avg = if x_min > x_min_ext {
        mean_color_range(base, x_min_ext, x_min - 1, y_min, y_max)
    } else {
        None
    };
    let right_avg = if x_max < x_max_ext {
        mean_color_range(base, x_max + 1, x_max_ext, y_min, y_max)
    } else {
        None
    };
    let top_avg = if y_min > y_min_ext {
        mean_color_range(base, x_min, x_max, y_min_ext, y_min - 1)
    } else {
        None
    };
    let bottom_avg = if y_max < y_max_ext {
        mean_color_range(base, x_min, x_max, y_max + 1, y_max_ext)
    } else {
        None
    };

    let h_variance = match (left_avg, right_avg) {
        (Some(l), Some(r)) => color_distance(l, r),
        _ => 0.0,
    };
    let v_variance = match (top_avg, bottom_avg) {
        (Some(t), Some(b)) => color_distance(t, b),
        _ => 0.0,
    };

    let region_width = (x_max - x_min + 1).max(1) as f64;
    let region_height = (y_max - y_min + 1).max(1) as f64;

    if h_variance > v_variance && h_variance > 100.0 {
        for y in y_min..=y_max {
            let left_color = mean_color_range(base, x_min_ext, x_min - 1, y, y)
                .or(left_avg)
                .unwrap_or(color_to_f64(fallback_color));
            let right_color = mean_color_range(base, x_max + 1, x_max_ext, y, y)
                .or(right_avg)
                .unwrap_or(color_to_f64(fallback_color));

            for x in x_min..=x_max {
                if mask.get_pixel(x as u32, y as u32)[0] == 0 {
                    continue;
                }
                let t = (x - x_min) as f64 / (region_width - 1.0).max(1.0);
                let color = lerp_color(left_color, right_color, t);
                filled.put_pixel(x as u32, y as u32, Rgb(color));
            }
        }
    } else if v_variance > 100.0 {
        for x in x_min..=x_max {
            let top_color = mean_color_range(base, x, x, y_min_ext, y_min - 1)
                .or(top_avg)
                .unwrap_or(color_to_f64(fallback_color));
            let bottom_color = mean_color_range(base, x, x, y_max + 1, y_max_ext)
                .or(bottom_avg)
                .unwrap_or(color_to_f64(fallback_color));

            for y in y_min..=y_max {
                if mask.get_pixel(x as u32, y as u32)[0] == 0 {
                    continue;
                }
                let t = (y - y_min) as f64 / (region_height - 1.0).max(1.0);
                let color = lerp_color(top_color, bottom_color, t);
                filled.put_pixel(x as u32, y as u32, Rgb(color));
            }
        }
    } else {
        for y in y_min..=y_max {
            for x in x_min..=x_max {
                if mask.get_pixel(x as u32, y as u32)[0] == 0 {
                    continue;
                }
                filled.put_pixel(x as u32, y as u32, Rgb(fallback_color));
            }
        }
    }

    filled
}

fn blend_into(base: &mut RgbImage, fill: &RgbImage, mask_feather: &[f32]) {
    let (width, height) = base.dimensions();
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let m = mask_feather[idx].clamp(0.0, 1.0);
            if m <= 0.001 {
                continue;
            }
            let src = base.get_pixel(x, y);
            let dst = fill.get_pixel(x, y);
            let inv = 1.0 - m;
            let r = dst[0] as f32 * m + src[0] as f32 * inv;
            let g = dst[1] as f32 * m + src[1] as f32 * inv;
            let b = dst[2] as f32 * m + src[2] as f32 * inv;
            base.put_pixel(x, y, Rgb([r.round() as u8, g.round() as u8, b.round() as u8]));
        }
    }
}

fn mean_color_range(
    image: &RgbImage,
    x0: i32,
    x1: i32,
    y0: i32,
    y1: i32,
) -> Option<[f64; 3]> {
    if x0 > x1 || y0 > y1 {
        return None;
    }
    let (width, height) = image.dimensions();
    let mut sum = [0f64; 3];
    let mut count = 0f64;

    let x0 = x0.max(0) as u32;
    let x1 = x1.min(width as i32 - 1) as u32;
    let y0 = y0.max(0) as u32;
    let y1 = y1.min(height as i32 - 1) as u32;

    for y in y0..=y1 {
        for x in x0..=x1 {
            let p = image.get_pixel(x, y);
            sum[0] += p[0] as f64;
            sum[1] += p[1] as f64;
            sum[2] += p[2] as f64;
            count += 1.0;
        }
    }

    if count <= 0.0 {
        None
    } else {
        Some([sum[0] / count, sum[1] / count, sum[2] / count])
    }
}

fn color_distance(a: [f64; 3], b: [f64; 3]) -> f64 {
    (a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2) + (a[2] - b[2]).powi(2)
}

fn color_to_f64(color: [u8; 3]) -> [f64; 3] {
    [color[0] as f64, color[1] as f64, color[2] as f64]
}

fn lerp_color(a: [f64; 3], b: [f64; 3], t: f64) -> [u8; 3] {
    let t = t.clamp(0.0, 1.0);
    let r = a[0] * (1.0 - t) + b[0] * t;
    let g = a[1] * (1.0 - t) + b[1] * t;
    let b = a[2] * (1.0 - t) + b[2] * t;
    [
        r.round().clamp(0.0, 255.0) as u8,
        g.round().clamp(0.0, 255.0) as u8,
        b.round().clamp(0.0, 255.0) as u8,
    ]
}


fn gaussian_blur_mask(mask: &GrayImage, radius: u32) -> Vec<f32> {
    let (width, height) = mask.dimensions();
    let size = (width * height) as usize;
    if radius == 0 {
        return mask
            .pixels()
            .map(|p| p[0] as f32 / 255.0)
            .collect();
    }

    let kernel = gaussian_kernel(radius);
    let mut tmp = vec![0f32; size];
    let mut out = vec![0f32; size];

    for y in 0..height {
        for x in 0..width {
            let mut sum = 0f32;
            for k in 0..kernel.len() {
                let offset = k as i32 - radius as i32;
                let xx = clamp_i32(x as i32 + offset, 0, width as i32 - 1) as u32;
                let v = mask.get_pixel(xx, y)[0] as f32 / 255.0;
                sum += v * kernel[k];
            }
            tmp[(y * width + x) as usize] = sum;
        }
    }

    for y in 0..height {
        for x in 0..width {
            let mut sum = 0f32;
            for k in 0..kernel.len() {
                let offset = k as i32 - radius as i32;
                let yy = clamp_i32(y as i32 + offset, 0, height as i32 - 1) as u32;
                sum += tmp[(yy * width + x) as usize] * kernel[k];
            }
            out[(y * width + x) as usize] = sum.clamp(0.0, 1.0);
        }
    }

    out
}

fn gaussian_kernel(radius: u32) -> Vec<f32> {
    let size = radius * 2 + 1;
    let sigma = (radius as f32 / 2.0).max(0.5);
    let mut kernel = Vec::with_capacity(size as usize);
    let mut sum = 0f32;
    for i in 0..size {
        let x = i as i32 - radius as i32;
        let v = (-((x * x) as f32) / (2.0 * sigma * sigma)).exp();
        kernel.push(v);
        sum += v;
    }
    for v in &mut kernel {
        *v /= sum;
    }
    kernel
}

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

fn clamp_i32(value: i32, min_val: i32, max_val: i32) -> i32 {
    if value < min_val {
        min_val
    } else if value > max_val {
        max_val
    } else {
        value
    }
}
