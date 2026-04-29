use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::{multipart, Client};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// 从 URL 下载图片并转换为 base64
async fn download_image_as_base64(client: &Client, url: &str) -> Result<String, String> {
    println!("[Rust] Downloading image from URL: {}", url);
    let start_time = std::time::Instant::now();

    let response = client
        .get(url)
        .timeout(Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "图片下载超时".to_string()
            } else if e.is_connect() {
                "无法连接到图片服务器".to_string()
            } else {
                format!("图片下载失败: {}", e)
            }
        })?;

    if !response.status().is_success() {
        return Err(format!(
            "图片下载失败，HTTP 状态码: {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取图片数据失败: {}", e))?;

    println!(
        "[Rust] Image downloaded: {} bytes in {:?}",
        bytes.len(),
        start_time.elapsed()
    );

    // 转换为 base64
    let base64_data = BASE64.encode(&bytes);
    Ok(base64_data)
}

fn strip_data_url_prefix(base64_data: &str) -> &str {
    base64_data
        .split_once(',')
        .map(|(_, data)| data)
        .unwrap_or(base64_data)
        .trim()
}

fn guess_image_mime(bytes: &[u8]) -> (&'static str, &'static str) {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        ("image/png", "png")
    } else if bytes.starts_with(b"\xff\xd8\xff") {
        ("image/jpeg", "jpg")
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        ("image/webp", "webp")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        ("image/gif", "gif")
    } else {
        ("image/png", "png")
    }
}

fn image_part_from_base64(base64_data: &str, filename_stem: &str) -> Result<multipart::Part, String> {
    let bytes = BASE64
        .decode(strip_data_url_prefix(base64_data))
        .map_err(|e| format!("图片 base64 解码失败: {}", e))?;
    let (mime, ext) = guess_image_mime(&bytes);

    multipart::Part::bytes(bytes)
        .file_name(format!("{}.{}", filename_stem, ext))
        .mime_str(mime)
        .map_err(|e| format!("设置图片 MIME 类型失败: {}", e))
}

// DALL-E API 请求结构
#[derive(Debug, Serialize)]
pub struct DalleRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
    // 垫图参数（部分模型支持）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    // 负面提示词（部分模型支持）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_compression: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<String>,
}

// DALL-E API 响应结构
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct DalleResponse {
    pub created: Option<i64>,
    pub data: Option<Vec<DalleImageData>>,
    pub error: Option<DalleError>,
}

#[derive(Debug, Deserialize)]
pub struct DalleImageData {
    pub url: Option<String>,
    pub b64_json: Option<String>,
    pub revised_prompt: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct DalleError {
    pub message: String,
    pub r#type: Option<String>,
    pub code: Option<String>,
}

// 前端调用的参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DalleRequestParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub operation: Option<String>,
    pub input_images: Option<Vec<String>>,
    pub mask_image: Option<String>,
    pub size: Option<String>,
    pub aspect_ratio: Option<String>,
    pub quality: Option<String>,
    pub style: Option<String>,
    pub background: Option<String>,
    pub output_format: Option<String>,
    pub output_compression: Option<u8>,
    pub moderation: Option<String>,
    pub input_fidelity: Option<String>,
    pub negative_prompt: Option<String>,
}

// 前端返回的结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DalleResult {
    pub success: bool,
    pub image_data: Option<String>,
    pub image_url: Option<String>,
    pub revised_prompt: Option<String>,
    pub error: Option<String>,
}

// Tauri 命令：发送 DALL-E API 请求
#[tauri::command]
pub async fn dalle_generate_image(params: DalleRequestParams) -> DalleResult {
    println!("[Rust] dalle_generate_image called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    let has_input_images = params
        .input_images
        .as_ref()
        .map(|images| images.iter().any(|image| !image.trim().is_empty()))
        .unwrap_or(false);
    let is_edit = params.operation.as_deref() == Some("edit")
        || has_input_images
        || params.mask_image.as_ref().map(|m| !m.trim().is_empty()).unwrap_or(false);

    // 构建 URL
    let endpoint = if is_edit { "edits" } else { "generations" };
    let url = format!(
        "{}/v1/images/{}",
        params.base_url.trim_end_matches('/'),
        endpoint
    );
    println!("[Rust] Request URL: {}", url);

    // 发送请求
    println!("[Rust] Sending OpenAI Images {} request...", endpoint);
    let start_time = std::time::Instant::now();

    let request_builder = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", params.api_key));

    let send_result = if is_edit {
        let images = params
            .input_images
            .as_ref()
            .map(|images| {
                images
                    .iter()
                    .filter(|image| !image.trim().is_empty())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        if images.is_empty() {
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: None,
                error: Some("图片编辑需要至少一张输入图片".to_string()),
            };
        }

        let mut form = multipart::Form::new()
            .text("model", params.model.clone())
            .text("prompt", params.prompt.clone());

        if let Some(size) = params.size.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("size", size.clone());
        }
        if let Some(quality) = params.quality.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("quality", quality.clone());
        }
        if let Some(background) = params.background.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("background", background.clone());
        }
        if let Some(output_format) = params.output_format.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("output_format", output_format.clone());
        }
        if let Some(output_compression) = params.output_compression {
            form = form.text("output_compression", output_compression.to_string());
        }
        if let Some(moderation) = params.moderation.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("moderation", moderation.clone());
        }
        if let Some(input_fidelity) = params.input_fidelity.as_ref().filter(|v| !v.trim().is_empty()) {
            form = form.text("input_fidelity", input_fidelity.clone());
        }

        for (index, image) in images.iter().enumerate() {
            let part = match image_part_from_base64(image, &format!("image-{}", index + 1)) {
                Ok(part) => part,
                Err(e) => {
                    return DalleResult {
                        success: false,
                        image_data: None,
                        image_url: None,
                        revised_prompt: None,
                        error: Some(e),
                    }
                }
            };
            form = form.part("image[]", part);
        }

        if let Some(mask_image) = params.mask_image.as_ref().filter(|v| !v.trim().is_empty()) {
            let part = match image_part_from_base64(mask_image, "mask") {
                Ok(part) => part,
                Err(e) => {
                    return DalleResult {
                        success: false,
                        image_data: None,
                        image_url: None,
                        revised_prompt: None,
                        error: Some(format!("蒙版图片处理失败: {}", e)),
                    }
                }
            };
            form = form.part("mask", part);
        }

        request_builder.multipart(form).send().await
    } else {
        let request_body = DalleRequest {
            model: params.model.clone(),
            prompt: params.prompt.clone(),
            size: params.size.clone(),
            aspect_ratio: params.aspect_ratio.clone(),
            n: Some(1),
            response_format: if params.model.starts_with("gpt-image") {
                None
            } else {
                Some("b64_json".to_string())
            },
            quality: params.quality.clone(),
            style: params.style.clone(),
            image: None,
            negative_prompt: params.negative_prompt.clone(),
            background: params.background.clone(),
            output_format: params.output_format.clone(),
            output_compression: params.output_compression,
            moderation: params.moderation.clone(),
        };

        request_builder
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
    };

    let response = match send_result {
        Ok(r) => {
            println!("[Rust] Response received in {:?}", start_time.elapsed());
            r
        }
        Err(e) => {
            println!("[Rust] Request failed: {}", e);
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    println!("[Rust] HTTP status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        println!("[Rust] Error response: {}", error_text);
        return DalleResult {
            success: false,
            image_data: None,
            image_url: None,
            revised_prompt: None,
            error: Some(format!("API 返回错误 ({}): {}", status, error_text)),
        };
    }

    // 解析响应
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    println!("[Rust] Response length: {} bytes", response_text.len());

    let dalle_response: DalleResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = dalle_response.error {
        return DalleResult {
            success: false,
            image_data: None,
            image_url: None,
            revised_prompt: None,
            error: Some(err.message),
        };
    }

    // 提取结果
    if let Some(data) = dalle_response.data {
        if let Some(image_data) = data.first() {
            println!("[Rust] DALL-E result: has_b64={}, has_url={}",
                image_data.b64_json.is_some(),
                image_data.url.is_some()
            );

            // 优先使用 base64 数据
            if let Some(b64) = &image_data.b64_json {
                return DalleResult {
                    success: true,
                    image_data: Some(b64.clone()),
                    image_url: image_data.url.clone(),
                    revised_prompt: image_data.revised_prompt.clone(),
                    error: None,
                };
            }

            // 如果只有 URL，下载图片并转换为 base64
            if let Some(url) = &image_data.url {
                println!("[Rust] No base64 data, downloading from URL...");
                match download_image_as_base64(&client, url).await {
                    Ok(base64_data) => {
                        return DalleResult {
                            success: true,
                            image_data: Some(base64_data),
                            image_url: Some(url.clone()),
                            revised_prompt: image_data.revised_prompt.clone(),
                            error: None,
                        };
                    }
                    Err(e) => {
                        println!("[Rust] Failed to download image: {}", e);
                        return DalleResult {
                            success: false,
                            image_data: None,
                            image_url: Some(url.clone()),
                            revised_prompt: image_data.revised_prompt.clone(),
                            error: Some(format!("图片生成成功但下载失败: {}", e)),
                        };
                    }
                }
            }

            // 既没有 base64 也没有 URL
            return DalleResult {
                success: false,
                image_data: None,
                image_url: None,
                revised_prompt: image_data.revised_prompt.clone(),
                error: Some("API 未返回图片数据或 URL".to_string()),
            };
        }
    }

    DalleResult {
        success: false,
        image_data: None,
        image_url: None,
        revised_prompt: None,
        error: Some("API 未返回有效内容".to_string()),
    }
}
