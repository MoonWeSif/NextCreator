// 文字去除服务
// 整合 Gemini 检测、掩码生成、自适应背景修复的完整流程

use super::gemini_detector::{detect_text, extract_text_styles, GeminiConfig, TextRegion, TextStyleInfo};
use super::adaptive_inpainter::adaptive_inpaint;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageFormat};
use serde::{Deserialize, Serialize};
use std::cmp::{max, min};
use std::collections::HashMap;
use std::io::Cursor;
use tauri::AppHandle;

/// 文字去除请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextRemovalParams {
    /// base64 编码的 PNG 图片
    pub image_data: String,
    /// Gemini API 基础 URL
    pub gemini_base_url: String,
    /// Gemini API Key
    pub gemini_api_key: String,
    /// Gemini 模型名称
    pub gemini_model: String,
}

/// 文字检测请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextDetectionParams {
    /// base64 编码的 PNG 图片
    pub image_data: String,
    /// Gemini API 基础 URL
    pub gemini_base_url: String,
    /// Gemini API Key
    pub gemini_api_key: String,
    /// Gemini 模型名称
    pub gemini_model: String,
}

/// 背景修复请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InpaintParams {
    /// base64 编码的 PNG 图片
    pub image_data: String,
    /// 检测到的文本区域（JSON 序列化）
    pub regions: Vec<TextRegionData>,
}

/// 文本区域数据（用于前端传递）
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TextRegionData {
    pub box_2d: [i32; 4],
    pub label: String,
    #[serde(default)]
    pub polygon: Vec<Vec<i32>>,
}

/// 文本框数据（兼容旧格式）
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TextBoxData {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub text: String,
    pub font_size: f64,
    pub color: String,
    pub bold: bool,
}

/// 文字去除结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextRemovalResult {
    pub success: bool,
    /// 去除文字后的背景图（base64 PNG）
    pub background_image: Option<String>,
    /// 检测到的文本框列表（兼容旧格式）
    pub text_boxes: Vec<TextBoxData>,
    /// 错误信息
    pub error: Option<String>,
}

/// 文字检测结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextDetectionResult {
    pub success: bool,
    /// 检测到的文本区域
    pub regions: Vec<TextRegionData>,
    /// 错误信息
    pub error: Option<String>,
}

/// 背景修复结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InpaintResult {
    pub success: bool,
    /// 修复后的背景图（base64 PNG）
    pub background_image: Option<String>,
    /// 错误信息
    pub error: Option<String>,
}

/// 阶段一：仅执行文字检测（可并发调用）
#[tauri::command]
pub async fn detect_text_regions(params: TextDetectionParams) -> TextDetectionResult {
    println!("[Rust] detect_text_regions 开始处理");

    let gemini_config = GeminiConfig {
        base_url: params.gemini_base_url,
        api_key: params.gemini_api_key,
        model: params.gemini_model,
    };

    match detect_text(&params.image_data, &gemini_config).await {
        Ok(result) => {
            println!("[Rust] 检测到 {} 个文本区域", result.regions.len());
            TextDetectionResult {
                success: true,
                regions: result
                    .regions
                    .into_iter()
                    .map(|r| TextRegionData {
                        box_2d: r.box_2d,
                        label: r.label,
                        polygon: r.polygon,
                    })
                    .collect(),
                error: None,
            }
        }
        Err(e) => TextDetectionResult {
            success: false,
            regions: vec![],
            error: Some(format!("文字检测失败: {}", e)),
        },
    }
}

/// 阶段二：仅执行背景修复（自适应轻量方案）
#[tauri::command]
pub async fn inpaint_background(_app: AppHandle, params: InpaintParams) -> InpaintResult {
    println!("[Rust] inpaint_background 开始处理");

    // 如果没有检测到文字，直接返回原图
    if params.regions.is_empty() {
        return InpaintResult {
            success: true,
            background_image: Some(params.image_data),
            error: None,
        };
    }

    // 解码图片
    let image_bytes = match STANDARD.decode(&params.image_data) {
        Ok(b) => b,
        Err(e) => {
            return InpaintResult {
                success: false,
                background_image: None,
                error: Some(format!("Base64 解码失败: {}", e)),
            }
        }
    };

    let img = match image::load_from_memory(&image_bytes) {
        Ok(i) => i,
        Err(e) => {
            return InpaintResult {
                success: false,
                background_image: None,
                error: Some(format!("图片解析失败: {}", e)),
            }
        }
    };

    // 转换区域格式
    let regions: Vec<TextRegion> = params
        .regions
        .into_iter()
        .map(|r| TextRegion {
            box_2d: r.box_2d,
            label: r.label,
            polygon: r.polygon,
        })
        .collect();

    // 执行自适应修复
    println!("[Rust] 执行自适应背景修复...");
    let rgb_image = img.to_rgb8();
    let inpainted = match tokio::task::spawn_blocking(move || {
        adaptive_inpaint(&rgb_image, &regions)
    })
    .await
    {
        Ok(Ok(result)) => result,
        Ok(Err(e)) => {
            return InpaintResult {
                success: false,
                background_image: None,
                error: Some(format!("背景修复失败: {}", e)),
            }
        }
        Err(e) => {
            return InpaintResult {
                success: false,
                background_image: None,
                error: Some(format!("背景修复任务失败: {}", e)),
            }
        }
    };

    // 编码结果图片
    let mut output_buffer = Cursor::new(Vec::new());
    if let Err(e) =
        DynamicImage::ImageRgb8(inpainted).write_to(&mut output_buffer, ImageFormat::Png)
    {
        return InpaintResult {
            success: false,
            background_image: None,
            error: Some(format!("图片编码失败: {}", e)),
        };
    }

    let result_base64 = STANDARD.encode(output_buffer.into_inner());

    println!("[Rust] 背景修复完成");

    InpaintResult {
        success: true,
        background_image: Some(result_base64),
        error: None,
    }
}

/// 执行文字去除
#[tauri::command]
pub async fn remove_text_from_image(
    _app: AppHandle,
    params: TextRemovalParams,
) -> TextRemovalResult {
    println!("[Rust] remove_text_from_image 开始处理");

    // 1. 解码图片
    let image_bytes = match STANDARD.decode(&params.image_data) {
        Ok(b) => b,
        Err(e) => {
            return TextRemovalResult {
                success: false,
                background_image: None,
                text_boxes: vec![],
                error: Some(format!("Base64 解码失败: {}", e)),
            }
        }
    };

    let img = match image::load_from_memory(&image_bytes) {
        Ok(i) => i,
        Err(e) => {
            return TextRemovalResult {
                success: false,
                background_image: None,
                text_boxes: vec![],
                error: Some(format!("图片解析失败: {}", e)),
            }
        }
    };

    let width = img.width();
    let height = img.height();
    println!("[Rust] 图片尺寸: {}x{}", width, height);

    // 2. 使用 Gemini 检测文字
    println!("[Rust] 开始 Gemini 文字检测...");
    let gemini_config = GeminiConfig {
        base_url: params.gemini_base_url,
        api_key: params.gemini_api_key,
        model: params.gemini_model,
    };

    let detection_result = match detect_text(&params.image_data, &gemini_config).await {
        Ok(r) => r,
        Err(e) => {
            return TextRemovalResult {
                success: false,
                background_image: None,
                text_boxes: vec![],
                error: Some(format!("文字检测失败: {}", e)),
            }
        }
    };

    println!(
        "[Rust] 检测到 {} 个文本区域",
        detection_result.regions.len()
    );

    // 如果没有检测到文字，直接返回原图
    if detection_result.regions.is_empty() {
        return TextRemovalResult {
            success: true,
            background_image: Some(params.image_data),
            text_boxes: vec![],
            error: None,
        };
    }

    // 3. 提取样式信息（失败则回退到默认样式）
    let styles = match extract_text_styles(&params.image_data, &detection_result.regions, &gemini_config).await {
        Ok(s) => s,
        Err(e) => {
            println!("[Rust] 样式提取失败，使用默认样式: {}", e);
            vec![]
        }
    };

    let rgb_image = img.to_rgb8();
    let text_boxes = build_text_boxes(
        &detection_result.regions,
        &styles,
        width,
        height,
        &rgb_image,
    );

    // 4. 执行自适应修复
    println!("[Rust] 执行自适应背景修复...");
    let regions = detection_result.regions.clone();
    let inpainted = match tokio::task::spawn_blocking(move || {
        adaptive_inpaint(&rgb_image, &regions)
    })
    .await
    {
        Ok(Ok(result)) => result,
        Ok(Err(e)) => {
            return TextRemovalResult {
                success: false,
                background_image: None,
                text_boxes,
                error: Some(format!("背景修复失败: {}", e)),
            }
        }
        Err(e) => {
            return TextRemovalResult {
                success: false,
                background_image: None,
                text_boxes,
                error: Some(format!("背景修复任务失败: {}", e)),
            }
        }
    };

    // 4. 编码结果图片
    let mut output_buffer = Cursor::new(Vec::new());
    if let Err(e) = DynamicImage::ImageRgb8(inpainted).write_to(&mut output_buffer, ImageFormat::Png)
    {
        return TextRemovalResult {
            success: false,
            background_image: None,
            text_boxes,
            error: Some(format!("图片编码失败: {}", e)),
        };
    }

    let result_base64 = STANDARD.encode(output_buffer.into_inner());

    println!("[Rust] 文字去除完成");

    TextRemovalResult {
        success: true,
        background_image: Some(result_base64),
        text_boxes,
        error: None,
    }
}

/// 合并后的文本块
#[derive(Debug, Clone)]
struct MergedTextBlock {
    lines: Vec<String>,
    box_2d: [i32; 4],
    primary_index: usize,
}

/// 构建文本框（合并多行 + 样式回填）
pub fn build_text_boxes(
    regions: &[TextRegion],
    styles: &[TextStyleInfo],
    width: u32,
    height: u32,
    rgb_image: &image::RgbImage,
) -> Vec<TextBoxData> {
    if regions.is_empty() {
        return vec![];
    }

    let blocks = merge_text_regions(regions);
    let mut style_map: HashMap<usize, &TextStyleInfo> = HashMap::new();
    for style in styles {
        style_map.insert(style.index, style);
    }

    blocks
        .into_iter()
        .map(|block| {
            let [ymin, xmin, ymax, xmax] = normalize_box(block.box_2d);

            let x = (xmin as f64 / 1000.0) * width as f64;
            let y = (ymin as f64 / 1000.0) * height as f64;
            let box_width = ((xmax - xmin) as f64 / 1000.0) * width as f64;
            let box_height = ((ymax - ymin) as f64 / 1000.0) * height as f64;

            let default_font_px = (box_height * 0.7).max(8.0).min(160.0);
            let mut font_px = default_font_px;
            let mut color = None;
            let mut bold = false;

            if let Some(style) = style_map.get(&block.primary_index) {
                if style.font_size > 0 {
                    let size_px = (style.font_size as f64) * 96.0 / 72.0;
                    font_px = size_px.max(8.0).min(160.0);
                }
                bold = style.is_bold;
                color = normalize_hex(&style.color_hex);
            }

            let color = color.unwrap_or_else(|| dominant_dark_color(rgb_image, [ymin, xmin, ymax, xmax]));

            TextBoxData {
                x,
                y,
                width: box_width,
                height: box_height,
                text: block.lines.join("\n"),
                font_size: font_px,
                color,
                bold,
            }
        })
        .collect()
}

fn normalize_box(box_2d: [i32; 4]) -> [i32; 4] {
    let ymin = min(1000, max(0, box_2d[0]));
    let xmin = min(1000, max(0, box_2d[1]));
    let ymax = min(1000, max(0, box_2d[2]));
    let xmax = min(1000, max(0, box_2d[3]));

    let y0 = min(ymin, ymax);
    let y1 = max(ymin, ymax);
    let x0 = min(xmin, xmax);
    let x1 = max(xmin, xmax);

    [y0, x0, y1, x1]
}

fn calculate_iou_1d(a_min: i32, a_max: i32, b_min: i32, b_max: i32) -> f64 {
    let overlap = max(0, min(a_max, b_max) - max(a_min, b_min)) as f64;
    let union = (max(a_max, b_max) - min(a_min, b_min)) as f64;
    if union <= 0.0 {
        0.0
    } else {
        overlap / union
    }
}

fn should_merge_regions(r1: &TextRegion, r2: &TextRegion) -> bool {
    let [y1_min, x1_min, y1_max, x1_max] = normalize_box(r1.box_2d);
    let [y2_min, x2_min, y2_max, x2_max] = normalize_box(r2.box_2d);

    let (top_min, top_max, top_xmin, top_xmax, bottom_min, bottom_max, bottom_xmin, bottom_xmax) =
        if y1_min <= y2_min {
            (y1_min, y1_max, x1_min, x1_max, y2_min, y2_max, x2_min, x2_max)
        } else {
            (y2_min, y2_max, x2_min, x2_max, y1_min, y1_max, x1_min, x1_max)
        };

    let h_overlap = calculate_iou_1d(top_xmin, top_xmax, bottom_xmin, bottom_xmax);
    let left_aligned = (top_xmin - bottom_xmin).abs() < 30;
    if h_overlap < 0.4 && !left_aligned {
        return false;
    }

    let h1 = (top_max - top_min) as f64;
    let h2 = (bottom_max - bottom_min) as f64;
    let max_h = h1.max(h2);
    let vertical_gap = (bottom_min - top_max) as f64;

    if vertical_gap > max_h * 1.0 {
        return false;
    }
    if vertical_gap < -max_h * 0.3 {
        return false;
    }

    true
}

fn merge_text_regions(regions: &[TextRegion]) -> Vec<MergedTextBlock> {
    let n = regions.len();
    if n == 0 {
        return vec![];
    }

    let mut parent: Vec<usize> = (0..n).collect();

    fn find(parent: &mut [usize], x: usize) -> usize {
        if parent[x] != x {
            parent[x] = find(parent, parent[x]);
        }
        parent[x]
    }

    fn union(parent: &mut [usize], x: usize, y: usize) {
        let px = find(parent, x);
        let py = find(parent, y);
        if px != py {
            parent[px] = py;
        }
    }

    for i in 0..n {
        for j in (i + 1)..n {
            if should_merge_regions(&regions[i], &regions[j]) {
                union(&mut parent, i, j);
            }
        }
    }

    let mut groups: HashMap<usize, Vec<usize>> = HashMap::new();
    for i in 0..n {
        let root = find(&mut parent, i);
        groups.entry(root).or_default().push(i);
    }

    let mut blocks = Vec::new();
    for indices in groups.values() {
        let mut sorted = indices.clone();
        sorted.sort_by_key(|&idx| regions[idx].box_2d[0]);

        let mut all_ymin = i32::MAX;
        let mut all_xmin = i32::MAX;
        let mut all_ymax = i32::MIN;
        let mut all_xmax = i32::MIN;

        let mut lines = Vec::new();
        for &idx in &sorted {
            let [ymin, xmin, ymax, xmax] = normalize_box(regions[idx].box_2d);
            all_ymin = min(all_ymin, ymin);
            all_xmin = min(all_xmin, xmin);
            all_ymax = max(all_ymax, ymax);
            all_xmax = max(all_xmax, xmax);
            lines.push(regions[idx].label.clone());
        }

        let primary_index = *sorted.first().unwrap_or(&0);

        blocks.push(MergedTextBlock {
            lines,
            box_2d: [all_ymin, all_xmin, all_ymax, all_xmax],
            primary_index,
        });
    }

    blocks.sort_by_key(|b| (b.box_2d[0], b.box_2d[1]));
    blocks
}

fn normalize_hex(input: &str) -> Option<String> {
    let mut s = input.trim().to_string();
    if s.starts_with('#') {
        s = s.trim_start_matches('#').to_string();
    }
    if s.len() != 6 || !s.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    Some(s.to_uppercase())
}

fn dominant_dark_color(rgb_image: &image::RgbImage, box_2d: [i32; 4]) -> String {
    let [ymin, xmin, ymax, xmax] = normalize_box(box_2d);
    if ymax <= ymin || xmax <= xmin {
        return "333333".to_string();
    }

    let width = rgb_image.width() as i32;
    let height = rgb_image.height() as i32;

    let x0 = ((xmin as f64 / 1000.0) * width as f64).round() as i32;
    let y0 = ((ymin as f64 / 1000.0) * height as f64).round() as i32;
    let x1 = ((xmax as f64 / 1000.0) * width as f64).round() as i32;
    let y1 = ((ymax as f64 / 1000.0) * height as f64).round() as i32;

    let x0 = min(width, max(0, x0));
    let y0 = min(height, max(0, y0));
    let x1 = min(width, max(0, x1));
    let y1 = min(height, max(0, y1));

    if x1 <= x0 || y1 <= y0 {
        return "333333".to_string();
    }

    let area = (x1 - x0) as f64 * (y1 - y0) as f64;
    let max_samples = 2000.0;
    let step = ((area / max_samples).sqrt().ceil() as i32).max(1);

    let mut samples: Vec<(f64, [u8; 3])> = Vec::new();
    let mut y = y0;
    while y < y1 {
        let mut x = x0;
        while x < x1 {
            let p = rgb_image.get_pixel(x as u32, y as u32).0;
            let brightness = (p[0] as f64 + p[1] as f64 + p[2] as f64) / 3.0;
            samples.push((brightness, [p[0], p[1], p[2]]));
            x += step;
        }
        y += step;
    }

    if samples.is_empty() {
        return "333333".to_string();
    }

    samples.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    let take_count = max(1, (samples.len() as f64 * 0.1).round() as i32) as usize;
    let darkest = &samples[..min(samples.len(), take_count)];

    let mut r_sum = 0f64;
    let mut g_sum = 0f64;
    let mut b_sum = 0f64;
    for (_, c) in darkest {
        r_sum += c[0] as f64;
        g_sum += c[1] as f64;
        b_sum += c[2] as f64;
    }

    let count = darkest.len() as f64;
    let r = (r_sum / count).round() as u8;
    let g = (g_sum / count).round() as u8;
    let b = (b_sum / count).round() as u8;

    format!("{:02X}{:02X}{:02X}", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_text_boxes() {
        // box_2d: [ymin, xmin, ymax, xmax] 归一化到 0-1000
        let regions = vec![TextRegion {
            box_2d: [100, 100, 200, 300],  // ymin=100, xmin=100, ymax=200, xmax=300
            label: "测试".to_string(),
            polygon: vec![],
        }];

        let img = image::RgbImage::new(1000, 1000);
        let converted = build_text_boxes(&regions, &[], 1000, 1000, &img);
        assert_eq!(converted.len(), 1);
        assert_eq!(converted[0].x, 100.0);      // xmin * 1000 / 1000
        assert_eq!(converted[0].y, 100.0);      // ymin * 1000 / 1000
        assert_eq!(converted[0].width, 200.0);  // (xmax - xmin) * 1000 / 1000
        assert_eq!(converted[0].height, 100.0); // (ymax - ymin) * 1000 / 1000
    }
}
