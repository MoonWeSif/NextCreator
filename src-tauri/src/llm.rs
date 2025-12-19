use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// ==================== 通用数据结构 ====================

// 文件数据结构（用于多模态输入）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileData {
    pub data: String,      // base64 编码的文件数据
    pub mime_type: String, // 文件MIME类型
    #[allow(dead_code)]
    pub file_name: Option<String>, // 文件名（可选，保留用于扩展）
}

// LLM 请求参数（前端传入）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMRequestParams {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i32>,
    pub files: Option<Vec<FileData>>,
    pub response_json_schema: Option<serde_json::Value>,
}

// LLM 响应结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMResult {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

// ==================== OpenAI 协议结构 ====================

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    response_format: Option<OpenAIResponseFormat>,
}

#[derive(Debug, Serialize)]
struct OpenAIMessage {
    role: String,
    content: OpenAIContent,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum OpenAIContent {
    Text(String),
    Parts(Vec<OpenAIContentPart>),
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum OpenAIContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: OpenAIImageUrl },
}

#[derive(Debug, Serialize)]
struct OpenAIImageUrl {
    url: String,
}

#[derive(Debug, Serialize)]
struct OpenAIResponseFormat {
    #[serde(rename = "type")]
    format_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    json_schema: Option<OpenAIJsonSchema>,
}

#[derive(Debug, Serialize)]
struct OpenAIJsonSchema {
    name: String,
    schema: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Option<Vec<OpenAIChoice>>,
    error: Option<OpenAIError>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: Option<OpenAIMessageResponse>,
}

#[derive(Debug, Deserialize)]
struct OpenAIMessageResponse {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIError {
    message: String,
}

// ==================== Claude 协议结构 ====================

#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    messages: Vec<ClaudeMessage>,
    max_tokens: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
}

#[derive(Debug, Serialize)]
struct ClaudeMessage {
    role: String,
    content: ClaudeContent,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum ClaudeContent {
    Text(String),
    Parts(Vec<ClaudeContentPart>),
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum ClaudeContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { source: ClaudeImageSource },
}

#[derive(Debug, Serialize)]
struct ClaudeImageSource {
    #[serde(rename = "type")]
    source_type: String,
    media_type: String,
    data: String,
}

#[derive(Debug, Deserialize)]
struct ClaudeResponse {
    content: Option<Vec<ClaudeContentBlock>>,
    error: Option<ClaudeError>,
}

#[derive(Debug, Deserialize)]
struct ClaudeContentBlock {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ClaudeError {
    message: String,
}

// ==================== OpenAI API 代理命令 ====================

#[tauri::command]
pub async fn openai_chat_completion(params: LLMRequestParams) -> LLMResult {
    println!("[Rust] openai_chat_completion called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 构建消息数组
    let mut messages: Vec<OpenAIMessage> = Vec::new();

    // 添加系统消息
    if let Some(system_prompt) = &params.system_prompt {
        if !system_prompt.is_empty() {
            messages.push(OpenAIMessage {
                role: "system".to_string(),
                content: OpenAIContent::Text(system_prompt.clone()),
            });
        }
    }

    // 构建用户消息
    let user_content = if let Some(files) = &params.files {
        if !files.is_empty() {
            // 多模态消息
            let mut parts: Vec<OpenAIContentPart> = vec![
                OpenAIContentPart::Text { text: params.prompt.clone() }
            ];
            for file in files {
                if file.mime_type.starts_with("image/") {
                    parts.push(OpenAIContentPart::ImageUrl {
                        image_url: OpenAIImageUrl {
                            url: format!("data:{};base64,{}", file.mime_type, file.data),
                        },
                    });
                }
            }
            OpenAIContent::Parts(parts)
        } else {
            OpenAIContent::Text(params.prompt.clone())
        }
    } else {
        OpenAIContent::Text(params.prompt.clone())
    };

    messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: user_content,
    });

    // 构建响应格式
    let response_format = params.response_json_schema.as_ref().map(|schema| {
        OpenAIResponseFormat {
            format_type: "json_schema".to_string(),
            json_schema: Some(OpenAIJsonSchema {
                name: "response".to_string(),
                schema: schema.clone(),
            }),
        }
    });

    // 构建请求体
    let request_body = OpenAIRequest {
        model: params.model.clone(),
        messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        response_format,
    };

    // 构建 URL
    let url = format!(
        "{}/v1/chat/completions",
        params.base_url.trim_end_matches('/')
    );
    println!("[Rust] Request URL: {}", url);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
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
    println!("[Rust] Sending OpenAI request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", params.api_key))
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
        println!("[Rust] Error response: {}", error_text);
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

    let openai_response: OpenAIResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            return LLMResult {
                success: false,
                content: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = openai_response.error {
        return LLMResult {
            success: false,
            content: None,
            error: Some(err.message),
        };
    }

    // 提取内容
    let content = openai_response
        .choices
        .and_then(|choices| choices.into_iter().next())
        .and_then(|choice| choice.message)
        .and_then(|msg| msg.content);

    if content.is_none() {
        return LLMResult {
            success: false,
            content: None,
            error: Some("API 未返回有效内容".to_string()),
        };
    }

    println!("[Rust] OpenAI result: content length = {}", content.as_ref().map(|c| c.len()).unwrap_or(0));

    LLMResult {
        success: true,
        content,
        error: None,
    }
}

// ==================== Claude API 代理命令 ====================

#[tauri::command]
pub async fn claude_chat_completion(params: LLMRequestParams) -> LLMResult {
    println!("[Rust] claude_chat_completion called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 构建用户消息
    let user_content = if let Some(files) = &params.files {
        if !files.is_empty() {
            // 多模态消息：Claude 要求图片在文本之前
            let mut parts: Vec<ClaudeContentPart> = Vec::new();
            for file in files {
                if file.mime_type.starts_with("image/") {
                    parts.push(ClaudeContentPart::Image {
                        source: ClaudeImageSource {
                            source_type: "base64".to_string(),
                            media_type: file.mime_type.clone(),
                            data: file.data.clone(),
                        },
                    });
                }
            }
            parts.push(ClaudeContentPart::Text { text: params.prompt.clone() });
            ClaudeContent::Parts(parts)
        } else {
            ClaudeContent::Text(params.prompt.clone())
        }
    } else {
        ClaudeContent::Text(params.prompt.clone())
    };

    let messages = vec![ClaudeMessage {
        role: "user".to_string(),
        content: user_content,
    }];

    // 构建请求体
    let request_body = ClaudeRequest {
        model: params.model.clone(),
        messages,
        max_tokens: params.max_tokens.unwrap_or(4096),
        system: params.system_prompt.clone(),
        temperature: params.temperature,
    };

    // 构建 URL
    let url = format!(
        "{}/v1/messages",
        params.base_url.trim_end_matches('/')
    );
    println!("[Rust] Request URL: {}", url);

    // 创建 HTTP 客户端
    let client = match Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
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
    println!("[Rust] Sending Claude request...");
    let start_time = std::time::Instant::now();

    let response = match client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("x-api-key", &params.api_key)
        .header("anthropic-version", "2023-06-01")
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
        println!("[Rust] Error response: {}", error_text);
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

    let claude_response: ClaudeResponse = match serde_json::from_str(&response_text) {
        Ok(r) => r,
        Err(e) => {
            println!("[Rust] Failed to parse JSON: {}", e);
            return LLMResult {
                success: false,
                content: None,
                error: Some(format!("解析响应失败: {}", e)),
            };
        }
    };

    // 检查 API 错误
    if let Some(err) = claude_response.error {
        return LLMResult {
            success: false,
            content: None,
            error: Some(err.message),
        };
    }

    // 提取内容
    let content = claude_response
        .content
        .and_then(|blocks| blocks.into_iter().next())
        .and_then(|block| block.text);

    if content.is_none() {
        return LLMResult {
            success: false,
            content: None,
            error: Some("API 未返回有效内容".to_string()),
        };
    }

    println!("[Rust] Claude result: content length = {}", content.as_ref().map(|c| c.len()).unwrap_or(0));

    LLMResult {
        success: true,
        content,
        error: None,
    }
}
