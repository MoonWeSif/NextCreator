use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// ==================== 视频服务数据结构 ====================

// 创建视频任务参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoCreateParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub seconds: Option<String>,
    pub size: Option<String>,
    pub input_image: Option<String>,  // base64 编码的参考图片
}

// 视频任务响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoTaskResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// 视频内容结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoContentResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_data: Option<String>,  // base64 编码的视频数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// 获取任务状态参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoStatusParams {
    pub base_url: String,
    pub api_key: String,
    pub task_id: String,
}

// API 响应结构
#[derive(Debug, Deserialize)]
struct VideoApiResponse {
    id: Option<String>,
    status: Option<String>,
    progress: Option<i32>,
    error: Option<VideoApiError>,
}

#[derive(Debug, Deserialize)]
struct VideoApiError {
    message: Option<String>,
}

// ==================== Veo 视频服务数据结构 ====================

// Veo 参考图片
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VeoReferenceImage {
    pub image: VeoImageData,
    pub reference_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VeoImageData {
    pub bytes_base64_encoded: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

// Veo metadata 参数
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VeoMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub person_generation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_images: Option<Vec<VeoReferenceImage>>,
}

// Veo 创建任务参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VeoCreateParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub images: Option<Vec<String>>,  // base64 编码的图片数组
    pub metadata: Option<VeoMetadata>,
}

// Veo API 请求体
#[derive(Debug, Serialize)]
pub struct VeoApiRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<VeoMetadata>,
}

// ==================== 创建视频任务 ====================

#[tauri::command]
pub async fn video_create_task(params: VideoCreateParams) -> VideoTaskResult {
    println!("[Rust] video_create_task called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 multipart form
    let mut form = reqwest::multipart::Form::new()
        .text("model", params.model.clone())
        .text("prompt", params.prompt.clone());

    if let Some(seconds) = params.seconds {
        form = form.text("seconds", seconds);
    }

    if let Some(size) = params.size {
        form = form.text("size", size);
    }

    // 添加参考图片
    if let Some(image_base64) = params.input_image {
        match BASE64.decode(&image_base64) {
            Ok(image_bytes) => {
                let part = reqwest::multipart::Part::bytes(image_bytes)
                    .file_name("reference.png")
                    .mime_str("image/png")
                    .unwrap_or_else(|_| reqwest::multipart::Part::bytes(vec![]));
                form = form.part("input_reference", part);
            }
            Err(e) => {
                println!("[Rust] Failed to decode input image: {}", e);
            }
        }
    }

    // 构建 URL
    let url = format!(
        "{}/v1/videos",
        params.base_url.trim_end_matches('/')
    );
    println!("[Rust] Request URL: {}", url);

    // 发送请求
    println!("[Rust] Sending video create request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .multipart(form)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            println!("[Rust] Request failed: {}", e);
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    if !status.is_success() {
        println!("[Rust] Error response: {}", response_text);
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应

    let api_response: VideoApiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = api_response.error {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: err.message,
        };
    }

    let task_id = api_response.id;
    if task_id.is_none() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some("API 未返回任务 ID".to_string()),
        };
    }

    println!("[Rust] Video task created: {:?}", task_id);

    VideoTaskResult {
        success: true,
        task_id,
        status: api_response.status,
        progress: api_response.progress,
        error: None,
    }
}

// ==================== 获取视频任务状态 ====================

#[tauri::command]
pub async fn video_get_status(params: VideoStatusParams) -> VideoTaskResult {
    println!("[Rust] video_get_status called, task_id: {}", params.task_id);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL
    let url = format!(
        "{}/v1/videos/{}",
        params.base_url.trim_end_matches('/'),
        params.task_id
    );

    // 发送请求
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "请求超时".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    if !status.is_success() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应
    let api_response: VideoApiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = api_response.error {
        return VideoTaskResult {
            success: false,
            task_id: Some(params.task_id),
            status: api_response.status,
            progress: api_response.progress,
            error: err.message,
        };
    }

    VideoTaskResult {
        success: true,
        task_id: Some(params.task_id),
        status: api_response.status,
        progress: api_response.progress,
        error: None,
    }
}

// ==================== 获取视频内容 ====================

#[tauri::command]
pub async fn video_get_content(params: VideoStatusParams) -> VideoContentResult {
    println!("[Rust] video_get_content called, task_id: {}", params.task_id);

    // 创建 HTTP 客户端（视频下载可能需要更长时间）
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL
    let url = format!(
        "{}/v1/videos/{}/content",
        params.base_url.trim_end_matches('/'),
        params.task_id
    );
    println!("[Rust] Fetching video content from: {}", url);

    // 发送请求
    let start_time = std::time::Instant::now();
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response headers received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "下载超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return VideoContentResult {
            success: false,
            video_data: None,
            error: Some(format!("获取视频失败 ({}): {}", status, error_text)),
        };
    }

    // 获取视频数据
    let video_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("下载视频失败: {}", e)),
            };
        }
    };

    println!("[Rust] Video downloaded: {} bytes in {:?}", video_bytes.len(), start_time.elapsed());

    // 转换为 base64
    let video_base64 = BASE64.encode(&video_bytes);

    VideoContentResult {
        success: true,
        video_data: Some(video_base64),
        error: None,
    }
}

// ==================== Veo 创建视频任务 ====================

#[tauri::command]
pub async fn veo_create_task(params: VeoCreateParams) -> VideoTaskResult {
    println!("[Rust] veo_create_task called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(120))  // Veo 可能需要更长时间
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建请求体
    let request_body = VeoApiRequest {
        model: params.model.clone(),
        prompt: params.prompt.clone(),
        images: params.images.clone(),
        metadata: params.metadata,
    };

    // 构建 URL
    let url = format!(
        "{}/v1/videos",
        params.base_url.trim_end_matches('/')
    );
    println!("[Rust] Request URL: {}", url);

    // 发送请求
    println!("[Rust] Sending Veo create request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            println!("[Rust] Request failed: {}", e);
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    if !status.is_success() {
        println!("[Rust] Error response: {}", response_text);
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应（Veo 响应格式中 task_id 字段可能是 id 或 task_id）
    #[derive(Debug, Deserialize)]
    struct VeoApiResponse {
        id: Option<String>,
        task_id: Option<String>,
        status: Option<String>,
        progress: Option<i32>,
        error: Option<VideoApiError>,
    }

    let api_response: VeoApiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            println!("[Rust] Response text: {}", response_text);
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = api_response.error {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: err.message,
        };
    }

    // 优先使用 task_id，否则使用 id
    let task_id = api_response.task_id.or(api_response.id);
    if task_id.is_none() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some("API 未返回任务 ID".to_string()),
        };
    }

    println!("[Rust] Veo task created: {:?}", task_id);

    VideoTaskResult {
        success: true,
        task_id,
        status: api_response.status,
        progress: api_response.progress,
        error: None,
    }
}

// ==================== Veo 获取视频任务状态 ====================

#[tauri::command]
pub async fn veo_get_status(params: VideoStatusParams) -> VideoTaskResult {
    println!("[Rust] veo_get_status called, task_id: {}", params.task_id);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL
    let url = format!(
        "{}/v1/videos/{}",
        params.base_url.trim_end_matches('/'),
        params.task_id
    );

    // 发送请求
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "请求超时".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    if !status.is_success() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应
    let api_response: VideoApiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = api_response.error {
        return VideoTaskResult {
            success: false,
            task_id: Some(params.task_id),
            status: api_response.status,
            progress: api_response.progress,
            error: err.message,
        };
    }

    VideoTaskResult {
        success: true,
        task_id: Some(params.task_id),
        status: api_response.status,
        progress: api_response.progress,
        error: None,
    }
}

// ==================== Veo 获取视频内容 ====================

#[tauri::command]
pub async fn veo_get_content(params: VideoStatusParams) -> VideoContentResult {
    println!("[Rust] veo_get_content called, task_id: {}", params.task_id);

    // 创建 HTTP 客户端（视频下载可能需要更长时间）
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL
    let url = format!(
        "{}/v1/videos/{}/content",
        params.base_url.trim_end_matches('/'),
        params.task_id
    );
    println!("[Rust] Fetching Veo video content from: {}", url);

    // 发送请求
    let start_time = std::time::Instant::now();
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response headers received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "下载超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return VideoContentResult {
            success: false,
            video_data: None,
            error: Some(format!("获取视频失败 ({}): {}", status, error_text)),
        };
    }

    // 获取视频数据
    let video_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("下载视频失败: {}", e)),
            };
        }
    };

    println!("[Rust] Veo video downloaded: {} bytes in {:?}", video_bytes.len(), start_time.elapsed());

    // 转换为 base64
    let video_base64 = BASE64.encode(&video_bytes);

    VideoContentResult {
        success: true,
        video_data: Some(video_base64),
        error: None,
    }
}

// ==================== Kling 视频服务数据结构 ====================

// Kling metadata 扩展参数
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct KlingMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality_level: Option<String>,
}

// Kling 创建任务参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KlingCreateParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub mode: String,  // "text2video" 或 "image2video"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,  // base64 编码的图片或 URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<KlingMetadata>,
}

// Kling 获取任务状态参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KlingStatusParams {
    pub base_url: String,
    pub api_key: String,
    pub task_id: String,
    pub mode: String,  // "text2video" 或 "image2video"
}

// Kling API 请求体
#[derive(Debug, Serialize)]
pub struct KlingApiRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<KlingMetadata>,
}

// Kling 视频内容结果（包含 URL）
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KlingContentResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_data: Option<String>,  // base64 编码的视频数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// Kling 下载参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KlingDownloadParams {
    pub video_url: String,
}

// ==================== Kling 创建视频任务 ====================

#[tauri::command]
pub async fn kling_create_task(params: KlingCreateParams) -> VideoTaskResult {
    println!("[Rust] kling_create_task called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);
    println!("[Rust] mode: {}", params.mode);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建请求体
    let request_body = KlingApiRequest {
        model: Some(params.model.clone()),
        prompt: Some(params.prompt.clone()),
        image: params.image.clone(),
        duration: params.duration,
        width: params.width,
        height: params.height,
        fps: params.fps,
        seed: params.seed,
        n: params.n,
        metadata: params.metadata,
    };

    // 构建 URL（根据模式选择端点）
    let endpoint = if params.mode == "image2video" {
        "image2video"
    } else {
        "text2video"
    };

    let url = format!(
        "{}/kling/v1/videos/{}",
        params.base_url.trim_end_matches('/'),
        endpoint
    );
    println!("[Rust] Request URL: {}", url);

    // 发送请求
    println!("[Rust] Sending Kling create request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            println!("[Rust] Request failed: {}", e);
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    println!("[Rust] Kling response: {}", response_text);

    if !status.is_success() {
        println!("[Rust] Error response: {}", response_text);
        // 尝试解析错误信息
        #[derive(Debug, Deserialize)]
        struct KlingErrorResponse {
            error: Option<KlingApiError>,
        }
        #[allow(dead_code)]
        #[derive(Debug, Deserialize)]
        struct KlingApiError {
            message: Option<String>,
            #[serde(rename = "type")]
            error_type: Option<String>,
            code: Option<String>,
        }

        if let Ok(err_resp) = serde_json::from_str::<KlingErrorResponse>(&response_text) {
            if let Some(err) = err_resp.error {
                return VideoTaskResult {
                    success: false,
                    task_id: None,
                    status: None,
                    progress: None,
                    error: err.message.or(Some(format!("API 错误: {}", status))),
                };
            }
        }

        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应
    #[derive(Debug, Deserialize)]
    struct KlingCreateResponse {
        task_id: Option<String>,
        status: Option<String>,
    }

    let api_response: KlingCreateResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            println!("[Rust] Response text: {}", response_text);
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    let task_id = api_response.task_id;
    if task_id.is_none() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some("API 未返回任务 ID".to_string()),
        };
    }

    println!("[Rust] Kling task created: {:?}", task_id);

    VideoTaskResult {
        success: true,
        task_id,
        status: api_response.status,
        progress: None,
        error: None,
    }
}

// ==================== Kling 获取视频任务状态 ====================

#[tauri::command]
pub async fn kling_get_status(params: KlingStatusParams) -> VideoTaskResult {
    println!("[Rust] kling_get_status called, task_id: {}, mode: {}", params.task_id, params.mode);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL（根据模式选择端点）
    let endpoint = if params.mode == "image2video" {
        "image2video"
    } else {
        "text2video"
    };

    let url = format!(
        "{}/kling/v1/videos/{}/{}",
        params.base_url.trim_end_matches('/'),
        endpoint,
        params.task_id
    );
    println!("[Rust] Status URL: {}", url);

    // 发送请求
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "请求超时".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    println!("[Rust] Kling status response: {}", response_text);

    if !status.is_success() {
        return VideoTaskResult {
            success: false,
            task_id: None,
            status: None,
            progress: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应
    #[allow(dead_code)]
    #[derive(Debug, Deserialize)]
    struct KlingStatusResponse {
        task_id: Option<String>,
        status: Option<String>,
        url: Option<String>,
        format: Option<String>,
        metadata: Option<serde_json::Value>,
        error: Option<KlingStatusError>,
    }

    #[derive(Debug, Deserialize)]
    struct KlingStatusError {
        code: Option<i32>,
        message: Option<String>,
    }

    let api_response: KlingStatusResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            return VideoTaskResult {
                success: false,
                task_id: None,
                status: None,
                progress: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = api_response.error {
        if err.message.is_some() && err.code.unwrap_or(0) != 0 {
            return VideoTaskResult {
                success: false,
                task_id: Some(params.task_id),
                status: api_response.status,
                progress: None,
                error: err.message,
            };
        }
    }

    VideoTaskResult {
        success: true,
        task_id: Some(params.task_id),
        status: api_response.status,
        progress: None,
        error: None,
    }
}

// ==================== Kling 获取视频内容（URL 或下载） ====================

#[tauri::command]
pub async fn kling_get_content(params: KlingStatusParams) -> KlingContentResult {
    println!("[Rust] kling_get_content called, task_id: {}, mode: {}", params.task_id, params.mode);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return KlingContentResult {
                success: false,
                video_url: None,
                video_data: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 构建 URL（根据模式选择端点）
    let endpoint = if params.mode == "image2video" {
        "image2video"
    } else {
        "text2video"
    };

    let url = format!(
        "{}/kling/v1/videos/{}/{}",
        params.base_url.trim_end_matches('/'),
        endpoint,
        params.task_id
    );

    // 发送请求获取状态（包含视频 URL）
    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", params.api_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "请求超时".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return KlingContentResult {
                success: false,
                video_url: None,
                video_data: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return KlingContentResult {
                success: false,
                video_url: None,
                video_data: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    if !status.is_success() {
        return KlingContentResult {
            success: false,
            video_url: None,
            video_data: None,
            error: Some(format!("API 返回错误 ({}): {}", status, response_text)),
        };
    }

    // 解析响应获取视频 URL
    #[derive(Debug, Deserialize)]
    struct KlingContentResponse {
        status: Option<String>,
        url: Option<String>,
    }

    let api_response: KlingContentResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            return KlingContentResult {
                success: false,
                video_url: None,
                video_data: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查任务是否完成
    if api_response.status.as_deref() != Some("completed") {
        return KlingContentResult {
            success: false,
            video_url: None,
            video_data: None,
            error: Some(format!("任务尚未完成，当前状态: {:?}", api_response.status)),
        };
    }

    // 获取视频 URL
    let video_url = match api_response.url {
        Some(u) => u,
        None => {
            return KlingContentResult {
                success: false,
                video_url: None,
                video_data: None,
                error: Some("API 未返回视频 URL".to_string()),
            };
        }
    };

    println!("[Rust] Kling video URL: {}", video_url);

    KlingContentResult {
        success: true,
        video_url: Some(video_url),
        video_data: None,
        error: None,
    }
}

// ==================== Kling 下载视频 ====================

#[tauri::command]
pub async fn kling_download_video(params: KlingDownloadParams) -> VideoContentResult {
    println!("[Rust] kling_download_video called, url: {}", params.video_url);

    // 创建 HTTP 客户端（视频下载可能需要更长时间）
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 发送请求下载视频
    let start_time = std::time::Instant::now();
    let response = match client
        .get(&params.video_url)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response headers received in {:?}", start_time.elapsed());
            r
        },
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "下载超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return VideoContentResult {
            success: false,
            video_data: None,
            error: Some(format!("下载视频失败 ({}): {}", status, error_text)),
        };
    }

    // 获取视频数据
    let video_bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return VideoContentResult {
                success: false,
                video_data: None,
                error: Some(format!("下载视频失败: {}", e)),
            };
        }
    };

    println!("[Rust] Kling video downloaded: {} bytes in {:?}", video_bytes.len(), start_time.elapsed());

    // 转换为 base64
    let video_base64 = BASE64.encode(&video_bytes);

    VideoContentResult {
        success: true,
        video_data: Some(video_base64),
        error: None,
    }
}
