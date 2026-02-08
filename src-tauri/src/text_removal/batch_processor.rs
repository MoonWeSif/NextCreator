// 批量处理服务
// 并发 Gemini 检测 + 自适应背景修复

use super::gemini_detector::{detect_text, extract_text_styles, GeminiConfig, TextRegion};
use super::service::{build_text_boxes, TextBoxData};
use super::adaptive_inpainter::adaptive_inpaint;

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageFormat, RgbImage};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

// ==================== 类型定义 ====================

/// 单个页面的输入数据
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PageInput {
    /// 页面索引
    pub page_index: usize,
    /// base64 编码的图片
    pub image_data: String,
}

/// 批量处理请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProcessParams {
    /// 待处理的页面列表
    pub pages: Vec<PageInput>,
    /// Gemini API 基础 URL
    pub gemini_base_url: String,
    /// Gemini API Key
    pub gemini_api_key: String,
    /// Gemini 模型名称
    pub gemini_model: String,
}

/// 页面处理进度事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageProgressEvent {
    /// 页面索引
    pub page_index: usize,
    /// 状态: detecting, inpainting, completed, error
    pub status: String,
    /// 错误信息（仅在 error 状态时有值）
    pub error: Option<String>,
    /// 处理后的背景图 base64（仅在 completed 状态时有值）
    pub background_image: Option<String>,
    /// 生成的文本框（仅在 completed 状态时有值）
    pub text_boxes: Option<Vec<TextBoxData>>,
    /// 原始图片宽度（仅在 completed 状态时有值）
    pub image_width: Option<u32>,
    /// 原始图片高度（仅在 completed 状态时有值）
    pub image_height: Option<u32>,
    /// 检测到的文字区域数量
    pub regions_count: Option<usize>,
}

/// 批量处理完成事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchCompleteEvent {
    /// 是否全部成功
    pub success: bool,
    /// 处理的总页面数
    pub total_processed: usize,
    /// 成功数
    pub total_success: usize,
    /// 错误数
    pub total_errors: usize,
}

/// 批量处理结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchProcessResult {
    pub success: bool,
    pub message: String,
}

// ==================== 全局停止信号 ====================

lazy_static::lazy_static! {
    static ref STOP_SIGNAL: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

/// 检查是否请求停止
fn is_stop_requested() -> bool {
    STOP_SIGNAL.load(Ordering::SeqCst)
}

/// 重置停止信号
fn reset_stop_signal() {
    STOP_SIGNAL.store(false, Ordering::SeqCst);
}

/// 设置停止信号
fn set_stop_signal() {
    STOP_SIGNAL.store(true, Ordering::SeqCst);
}

// ==================== 命令实现 ====================

/// 批量处理页面
#[tauri::command]
pub async fn process_pages_batch(app: AppHandle, params: BatchProcessParams) -> BatchProcessResult {
    println!(
        "[Rust] process_pages_batch 开始处理 {} 个页面",
        params.pages.len()
    );

    // 重置停止信号
    reset_stop_signal();

    let gemini_config = GeminiConfig {
        base_url: params.gemini_base_url.clone(),
        api_key: params.gemini_api_key.clone(),
        model: params.gemini_model.clone(),
    };

    let app_handle = app.clone();

    // 统计
    let total_pages = params.pages.len();
    let success_count = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let error_count = Arc::new(std::sync::atomic::AtomicUsize::new(0));

    // 并发处理所有页面（检测 + 修复）
    let mut detect_handles = Vec::new();

    for page in params.pages {
        if is_stop_requested() {
            break;
        }

        let gemini_cfg = gemini_config.clone();
        let app_for_detect = app_handle.clone();
        let error_for_detect = error_count.clone();
        let success_for_detect = success_count.clone();
        let handle = tokio::spawn(async move {
            let page_index = page.page_index;

            // 检查停止信号
            if is_stop_requested() {
                return;
            }

            // 发送 detecting 状态
            let _ = app_for_detect.emit(
                "batch-page-progress",
                PageProgressEvent {
                    page_index,
                    status: "detecting".to_string(),
                    error: None,
                    background_image: None,
                    text_boxes: None,
                    image_width: None,
                    image_height: None,
                    regions_count: None,
                },
            );

            // 执行检测
            match detect_text(&page.image_data, &gemini_cfg).await {
                Ok(result) => {
                    if is_stop_requested() {
                        return;
                    }

                    println!(
                        "[Rust] 页面 {} 检测到 {} 个文本区域",
                        page_index,
                        result.regions.len()
                    );

                    // 解码图片（用于尺寸/样式/文本框计算）
                    let image_bytes = match STANDARD.decode(&page.image_data) {
                        Ok(b) => b,
                        Err(e) => {
                            error_for_detect.fetch_add(1, Ordering::SeqCst);
                            let _ = app_for_detect.emit(
                                "batch-page-progress",
                                PageProgressEvent {
                                    page_index,
                                    status: "error".to_string(),
                                    error: Some(format!("Base64 解码失败: {}", e)),
                                    background_image: None,
                                    text_boxes: None,
                                    image_width: None,
                                    image_height: None,
                                    regions_count: None,
                                },
                            );
                            return;
                        }
                    };

                    let img = match image::load_from_memory(&image_bytes) {
                        Ok(i) => i,
                        Err(e) => {
                            error_for_detect.fetch_add(1, Ordering::SeqCst);
                            let _ = app_for_detect.emit(
                                "batch-page-progress",
                                PageProgressEvent {
                                    page_index,
                                    status: "error".to_string(),
                                    error: Some(format!("图片解析失败: {}", e)),
                                    background_image: None,
                                    text_boxes: None,
                                    image_width: None,
                                    image_height: None,
                                    regions_count: None,
                                },
                            );
                            return;
                        }
                    };

                    let image_width = img.width();
                    let image_height = img.height();
                    let rgb_image = img.to_rgb8();

                    // 如果没有检测到文字，直接完成
                    if result.regions.is_empty() {
                        success_for_detect.fetch_add(1, Ordering::SeqCst);
                        let _ = app_for_detect.emit(
                            "batch-page-progress",
                            PageProgressEvent {
                                page_index,
                                status: "completed".to_string(),
                                error: None,
                                background_image: Some(page.image_data.clone()),
                                text_boxes: Some(vec![]),
                                image_width: Some(image_width),
                                image_height: Some(image_height),
                                regions_count: Some(0),
                            },
                        );
                        return;
                    }

                    let styles = match extract_text_styles(&page.image_data, &result.regions, &gemini_cfg).await {
                        Ok(s) => s,
                        Err(e) => {
                            println!("[Rust] 样式提取失败，使用默认样式: {}", e);
                            vec![]
                        }
                    };

                    let text_boxes = build_text_boxes(
                        &result.regions,
                        &styles,
                        image_width,
                        image_height,
                        &rgb_image,
                    );

                    // 发送 inpainting 状态
                    let _ = app_for_detect.emit(
                        "batch-page-progress",
                        PageProgressEvent {
                            page_index,
                            status: "inpainting".to_string(),
                            error: None,
                            background_image: None,
                            text_boxes: None,
                            image_width: None,
                            image_height: None,
                            regions_count: Some(result.regions.len()),
                        },
                    );

                    if is_stop_requested() {
                        return;
                    }

                    match process_inpaint(rgb_image, &result.regions).await {
                        Ok(bg_image) => {
                            success_for_detect.fetch_add(1, Ordering::SeqCst);
                            let _ = app_for_detect.emit(
                                "batch-page-progress",
                                PageProgressEvent {
                                    page_index,
                                    status: "completed".to_string(),
                                    error: None,
                                    background_image: Some(bg_image),
                                    text_boxes: Some(text_boxes),
                                    image_width: Some(image_width),
                                    image_height: Some(image_height),
                                    regions_count: Some(result.regions.len()),
                                },
                            );
                        }
                        Err(e) => {
                            error_for_detect.fetch_add(1, Ordering::SeqCst);
                            let _ = app_for_detect.emit(
                                "batch-page-progress",
                                PageProgressEvent {
                                    page_index,
                                    status: "error".to_string(),
                                    error: Some(e),
                                    background_image: None,
                                    text_boxes: None,
                                    image_width: None,
                                    image_height: None,
                                    regions_count: None,
                                },
                            );
                        }
                    }
                }
                Err(e) => {
                    error_for_detect.fetch_add(1, Ordering::SeqCst);
                    let _ = app_for_detect.emit(
                        "batch-page-progress",
                        PageProgressEvent {
                            page_index,
                            status: "error".to_string(),
                            error: Some(format!("文字检测失败: {}", e)),
                            background_image: None,
                            text_boxes: None,
                            image_width: None,
                            image_height: None,
                            regions_count: None,
                        },
                    );
                }
            }
        });

        detect_handles.push(handle);
    }

    // 等待所有检测任务完成
    for handle in detect_handles {
        let _ = handle.await;
    }

    // 发送批量完成事件
    let total_success = success_count.load(Ordering::SeqCst);
    let total_errors = error_count.load(Ordering::SeqCst);

    let _ = app.emit(
        "batch-complete",
        BatchCompleteEvent {
            success: total_errors == 0,
            total_processed: total_pages,
            total_success,
            total_errors,
        },
    );

    println!(
        "[Rust] 批量处理完成: 成功 {}, 失败 {}",
        total_success, total_errors
    );

    // 重置停止信号
    reset_stop_signal();

    BatchProcessResult {
        success: true,
        message: format!(
            "处理完成: {} 成功, {} 失败",
            total_success, total_errors
        ),
    }
}

/// 停止批量处理
#[tauri::command]
pub async fn stop_batch_processing() -> BatchProcessResult {
    println!("[Rust] 收到停止批量处理请求");
    set_stop_signal();
    BatchProcessResult {
        success: true,
        message: "已发送停止信号".to_string(),
    }
}

// ==================== 辅助函数 ====================

/// 执行单页修复
async fn process_inpaint(
    rgb_image: RgbImage,
    regions: &[TextRegion],
) -> Result<String, String> {
    let regions_vec = regions.to_vec();
    let inpainted = tokio::task::spawn_blocking(move || {
        adaptive_inpaint(&rgb_image, &regions_vec)
    })
    .await
    .map_err(|e| format!("背景修复任务失败: {}", e))?
    .map_err(|e| format!("背景修复失败: {}", e))?;

    // 编码结果
    let mut output_buffer = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(inpainted)
        .write_to(&mut output_buffer, ImageFormat::Png)
        .map_err(|e| format!("图片编码失败: {}", e))?;

    Ok(STANDARD.encode(output_buffer.into_inner()))
}
