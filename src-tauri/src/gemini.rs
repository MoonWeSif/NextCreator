use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Gemini API 请求结构
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiRequest {
    pub contents: Vec<Content>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GenerationConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Content {
    pub parts: Vec<Part>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Part {
    Text { text: String },
    InlineData { inline_data: InlineData },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InlineData {
    pub mime_type: String,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_modalities: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_config: Option<ImageConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_size: Option<String>,
}

// Gemini API 响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiResponse {
    pub candidates: Option<Vec<Candidate>>,
    pub error: Option<GeminiError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Candidate {
    pub content: Option<CandidateContent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CandidateContent {
    pub parts: Option<Vec<ResponsePart>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponsePart {
    pub text: Option<String>,
    pub inline_data: Option<InlineData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiError {
    pub message: String,
    pub code: Option<i32>,
}

// 前端调用的参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiRequestParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub input_images: Option<Vec<String>>, // base64 图片数据
    pub aspect_ratio: Option<String>,
    pub image_size: Option<String>,
}

// 前端返回的结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiResult {
    pub success: bool,
    pub image_data: Option<String>,
    pub text: Option<String>,
    pub error: Option<String>,
}

// Tauri 命令：发送 Gemini API 请求
#[tauri::command]
pub async fn gemini_generate_content(params: GeminiRequestParams) -> GeminiResult {
    println!("[Rust] gemini_generate_content called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);
    println!(
        "[Rust] input_images count: {}",
        params.input_images.as_ref().map(|v| v.len()).unwrap_or(0)
    );

    // 构建请求体
    let mut parts: Vec<Part> = vec![Part::Text {
        text: params.prompt,
    }];

    // 添加输入图片
    if let Some(images) = params.input_images {
        println!("[Rust] Adding {} images to request", images.len());
        for image_data in images {
            parts.push(Part::InlineData {
                inline_data: InlineData {
                    mime_type: "image/png".to_string(),
                    data: image_data,
                },
            });
        }
    }

    let request_body = GeminiRequest {
        contents: vec![Content { parts }],
        generation_config: Some(GenerationConfig {
            response_modalities: Some(vec!["IMAGE".to_string()]),
            image_config: Some(ImageConfig {
                aspect_ratio: params.aspect_ratio,
                image_size: params.image_size,
            }),
        }),
    };

    // 构建 URL
    let url = format!(
        "{}/v1beta/models/{}:generateContent?key={}",
        params.base_url.trim_end_matches('/'),
        params.model,
        params.api_key
    );
    println!(
        "[Rust] Request URL (without key): {}/v1beta/models/{}:generateContent",
        params.base_url.trim_end_matches('/'),
        params.model
    );

    // 创建 HTTP 客户端，设置较长的超时时间（10分钟）
    println!("[Rust] Creating HTTP client with 600s timeout...");
    let client = match Client::builder().timeout(Duration::from_secs(600)).build() {
        Ok(c) => c,
        Err(e) => {
            println!("[Rust] Failed to create HTTP client: {}", e);
            return GeminiResult {
                success: false,
                image_data: None,
                text: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            };
        }
    };

    // 发送请求
    println!("[Rust] Sending POST request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] Response received in {:?}", start_time.elapsed());
            r
        }
        Err(e) => {
            println!(
                "[Rust] Request failed after {:?}: {}",
                start_time.elapsed(),
                e
            );
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return GeminiResult {
                success: false,
                image_data: None,
                text: None,
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
        return GeminiResult {
            success: false,
            image_data: None,
            text: None,
            error: Some(format!("API 返回错误 ({}): {}", status, error_text)),
        };
    }

    // 先获取响应文本，再解析 JSON
    println!("[Rust] Getting response text...");
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            println!("[Rust] Failed to get response text: {}", e);
            return GeminiResult {
                success: false,
                image_data: None,
                text: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    println!("[Rust] Response text length: {} bytes", response_text.len());
    // 打印前 500 个字符用于调试
    let preview = if response_text.len() > 500 {
        format!("{}...(truncated)", &response_text[..500])
    } else {
        response_text.clone()
    };
    println!("[Rust] Response preview: {}", preview);

    // 解析 JSON
    println!("[Rust] Parsing JSON...");
    let gemini_response: GeminiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            println!(
                "[Rust] JSON error location: line {}, column {}",
                e.line(),
                e.column()
            );
            return GeminiResult {
                success: false,
                image_data: None,
                text: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = gemini_response.error {
        println!("[Rust] API error: {}", err.message);
        return GeminiResult {
            success: false,
            image_data: None,
            text: None,
            error: Some(err.message),
        };
    }

    // 提取结果
    let mut image_data: Option<String> = None;
    let mut text: Option<String> = None;

    if let Some(candidates) = gemini_response.candidates {
        if let Some(candidate) = candidates.first() {
            if let Some(content) = &candidate.content {
                if let Some(parts) = &content.parts {
                    for part in parts {
                        if let Some(inline) = &part.inline_data {
                            image_data = Some(inline.data.clone());
                        }
                        if let Some(t) = &part.text {
                            text = Some(t.clone());
                        }
                    }
                }
            }
        }
    }

    println!(
        "[Rust] Result: has_image={}, has_text={}",
        image_data.is_some(),
        text.is_some()
    );

    if image_data.is_none() && text.is_none() {
        return GeminiResult {
            success: false,
            image_data: None,
            text: None,
            error: Some("API 未返回有效内容".to_string()),
        };
    }

    GeminiResult {
        success: true,
        image_data,
        text,
        error: None,
    }
}

// 文件数据结构（用于LLM内容生成）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileData {
    pub data: String,              // base64 编码的文件数据
    pub mime_type: String,         // 文件MIME类型
    pub file_name: Option<String>, // 文件名（可选）
}

// LLM 文本生成请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMRequestParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub output_format: Option<String>, // "text" or "json"
    pub temperature: Option<f64>,
    pub max_tokens: Option<i32>,
    pub files: Option<Vec<FileData>>, // 文件数据（PDF、图片等）
    pub response_json_schema: Option<serde_json::Value>, // 结构化输出的 JSON Schema
}

// LLM 文本生成结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMResult {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

// LLM 专用请求体
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMRequest {
    pub contents: Vec<Content>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<LLMGenerationConfig>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_schema: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i32>,
}

// Tauri 命令：LLM 文本生成
#[tauri::command]
pub async fn gemini_generate_text(params: LLMRequestParams) -> LLMResult {
    println!("[Rust] gemini_generate_text called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);
    println!(
        "[Rust] files count: {}",
        params.files.as_ref().map(|v| v.len()).unwrap_or(0)
    );

    // 构建请求内容
    let prompt_text = if let Some(system_prompt) = &params.system_prompt {
        if !system_prompt.is_empty() {
            format!("系统指令：{}\n\n用户请求：{}", system_prompt, params.prompt)
        } else {
            params.prompt.clone()
        }
    } else {
        params.prompt.clone()
    };

    // 构建 parts：先添加文本，再添加文件
    let mut parts: Vec<Part> = vec![Part::Text { text: prompt_text }];

    // 添加文件（PDF、图片等）
    if let Some(files) = &params.files {
        println!("[Rust] Adding {} files to request", files.len());
        for file in files {
            println!(
                "[Rust] Adding file: mime_type={}, name={:?}",
                file.mime_type, file.file_name
            );
            parts.push(Part::InlineData {
                inline_data: InlineData {
                    mime_type: file.mime_type.clone(),
                    data: file.data.clone(),
                },
            });
        }
    }

    let request_body = LLMRequest {
        contents: vec![Content { parts }],
        generation_config: Some(LLMGenerationConfig {
            response_mime_type: if params.response_json_schema.is_some()
                || params.output_format.as_deref() == Some("json")
            {
                Some("application/json".to_string())
            } else {
                None
            },
            response_schema: params.response_json_schema,
            temperature: params.temperature,
            max_output_tokens: params.max_tokens,
        }),
    };

    // 构建 URL
    let url = format!(
        "{}/v1beta/models/{}:generateContent?key={}",
        params.base_url.trim_end_matches('/'),
        params.model,
        params.api_key
    );
    println!(
        "[Rust] Request URL (without key): {}/v1beta/models/{}:generateContent",
        params.base_url.trim_end_matches('/'),
        params.model
    );

    // 创建 HTTP 客户端
    let client = match Client::builder().timeout(Duration::from_secs(300)).build() {
        Ok(c) => c,
        Err(e) => {
            return LLMResult {
                success: false,
                content: None,
                error: Some(format!("创建 HTTP 客户端失败: {}", e)),
            }
        }
    };

    // 发送请求
    println!("[Rust] Sending LLM request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(r) => {
            println!("[Rust] LLM response received in {:?}", start_time.elapsed());
            r
        }
        Err(e) => {
            println!("[Rust] LLM request failed: {}", e);
            let error_msg = if e.is_timeout() {
                "请求超时，请稍后重试".to_string()
            } else if e.is_connect() {
                "无法连接到服务器，请检查网络".to_string()
            } else {
                format!("请求失败: {}", e)
            };
            return LLMResult {
                success: false,
                content: None,
                error: Some(error_msg),
            };
        }
    };

    // 检查 HTTP 状态码
    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        println!("[Rust] LLM error response: {}", error_text);
        return LLMResult {
            success: false,
            content: None,
            error: Some(format!("API 返回错误 ({}): {}", status, error_text)),
        };
    }

    // 解析响应
    let response_text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return LLMResult {
                success: false,
                content: None,
                error: Some(format!("获取响应失败: {}", e)),
            };
        }
    };

    let gemini_response: GeminiResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            return LLMResult {
                success: false,
                content: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = gemini_response.error {
        return LLMResult {
            success: false,
            content: None,
            error: Some(err.message),
        };
    }

    // 提取文本内容
    let mut content: Option<String> = None;

    if let Some(candidates) = gemini_response.candidates {
        if let Some(candidate) = candidates.first() {
            if let Some(candidate_content) = &candidate.content {
                if let Some(parts) = &candidate_content.parts {
                    let mut text_parts: Vec<String> = Vec::new();
                    for part in parts {
                        if let Some(t) = &part.text {
                            text_parts.push(t.clone());
                        }
                    }
                    if !text_parts.is_empty() {
                        content = Some(text_parts.join(""));
                    }
                }
            }
        }
    }

    if content.is_none() {
        return LLMResult {
            success: false,
            content: None,
            error: Some("API 未返回有效内容".to_string()),
        };
    }

    println!(
        "[Rust] LLM result: content length = {}",
        content.as_ref().map(|c| c.len()).unwrap_or(0)
    );

    LLMResult {
        success: true,
        content,
        error: None,
    }
}
