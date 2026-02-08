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
    strict: bool,
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

// ==================== OpenAI Responses 协议结构 ====================

#[derive(Debug, Serialize)]
struct OpenAIResponsesRequest {
    model: String,
    input: Vec<OpenAIResponsesInputItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    instructions: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<OpenAIResponsesText>,
}

#[derive(Debug, Serialize)]
struct OpenAIResponsesInputItem {
    #[serde(rename = "type")]
    item_type: String,
    role: String,
    content: Vec<OpenAIResponsesInputContent>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum OpenAIResponsesInputContent {
    #[serde(rename = "input_text")]
    InputText { text: String },
    #[serde(rename = "input_image")]
    InputImage { image_url: OpenAIImageUrl },
}

#[derive(Debug, Serialize)]
struct OpenAIResponsesText {
    format: OpenAIResponsesTextFormat,
}

#[derive(Debug, Serialize)]
struct OpenAIResponsesTextFormat {
    #[serde(rename = "type")]
    format_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    schema: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    strict: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponsesResponse {
    output: Option<Vec<OpenAIResponsesOutputItem>>,
    error: Option<OpenAIError>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponsesOutputItem {
    #[serde(rename = "type")]
    item_type: String,
    role: Option<String>,
    content: Option<Vec<OpenAIResponsesContent>>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponsesContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
    refusal: Option<String>,
}

// ==================== OpenAI Structured Output Helpers ====================

#[derive(Debug, Clone, Copy)]
enum OpenAIStructuredOutputMode {
    JsonSchema,
    JsonObject,
}

fn is_openai_json_schema_supported(model: &str) -> bool {
    let _ = model;
    true
}

fn is_date_gte(date: &str, min: &str) -> bool {
    let parse = |s: &str| -> Option<(i32, i32, i32)> {
        let parts: Vec<&str> = s.split('-').collect();
        if parts.len() != 3 {
            return None;
        }
        let y = parts[0].parse::<i32>().ok()?;
        let m = parts[1].parse::<i32>().ok()?;
        let d = parts[2].parse::<i32>().ok()?;
        Some((y, m, d))
    };
    match (parse(date), parse(min)) {
        (Some(a), Some(b)) => a >= b,
        _ => false,
    }
}

fn select_openai_structured_output_mode(model: &str) -> OpenAIStructuredOutputMode {
    if is_openai_json_schema_supported(model) {
        OpenAIStructuredOutputMode::JsonSchema
    } else {
        OpenAIStructuredOutputMode::JsonObject
    }
}

fn schema_allows_null(schema: &serde_json::Value) -> bool {
    match schema {
        serde_json::Value::Object(map) => {
            if let Some(t) = map.get("type") {
                match t {
                    serde_json::Value::String(s) => s == "null",
                    serde_json::Value::Array(arr) => arr.iter().any(|v| v.as_str() == Some("null")),
                    _ => false,
                }
            } else if let Some(any_of) = map.get("anyOf") {
                any_of.as_array().map(|arr| arr.iter().any(schema_allows_null)).unwrap_or(false)
            } else {
                false
            }
        }
        _ => false,
    }
}

fn make_nullable(schema: serde_json::Value) -> serde_json::Value {
    if schema_allows_null(&schema) {
        return schema;
    }
    match schema {
        serde_json::Value::Object(mut map) => {
            if let Some(t) = map.get_mut("type") {
                match t {
                    serde_json::Value::String(s) => {
                        let mut types = vec![
                            serde_json::Value::String(s.clone()),
                            serde_json::Value::String("null".to_string()),
                        ];
                        *t = serde_json::Value::Array(types.drain(..).collect());
                        return serde_json::Value::Object(map);
                    }
                    serde_json::Value::Array(arr) => {
                        if !arr.iter().any(|v| v.as_str() == Some("null")) {
                            arr.push(serde_json::Value::String("null".to_string()));
                        }
                        return serde_json::Value::Object(map);
                    }
                    _ => {}
                }
            }
            serde_json::Value::Object(map)
        }
        other => serde_json::json!({ "anyOf": [other, { "type": "null" }] }),
    }
}

fn normalize_schema_for_openai(schema: &serde_json::Value) -> serde_json::Value {
    match schema {
        serde_json::Value::Object(map) => {
            let mut new_map = map.clone();

            if let Some(any_of) = map.get("anyOf") {
                if let Some(arr) = any_of.as_array() {
                    let normalized_any_of: Vec<serde_json::Value> = arr
                        .iter()
                        .map(normalize_schema_for_openai)
                        .collect();
                    new_map.insert("anyOf".to_string(), serde_json::Value::Array(normalized_any_of));
                }
            }

            if let Some(items) = map.get("items") {
                new_map.insert("items".to_string(), normalize_schema_for_openai(items));
            }

            if let Some(defs) = map.get("$defs").and_then(|v| v.as_object()) {
                let mut new_defs = serde_json::Map::new();
                for (name, def_schema) in defs.iter() {
                    new_defs.insert(name.clone(), normalize_schema_for_openai(def_schema));
                }
                new_map.insert("$defs".to_string(), serde_json::Value::Object(new_defs));
            }

            if let Some(defs) = map.get("definitions").and_then(|v| v.as_object()) {
                let mut new_defs = serde_json::Map::new();
                for (name, def_schema) in defs.iter() {
                    new_defs.insert(name.clone(), normalize_schema_for_openai(def_schema));
                }
                new_map.insert("definitions".to_string(), serde_json::Value::Object(new_defs));
            }

            if map.get("type").and_then(|v| v.as_str()) == Some("object") || map.contains_key("properties") {
                if let Some(props) = map.get("properties").and_then(|v| v.as_object()) {
                    let required: Vec<String> = map
                        .get("required")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()
                        })
                        .unwrap_or_default();
                    let required_set: std::collections::HashSet<String> = required.into_iter().collect();

                    let mut new_props = serde_json::Map::new();
                    for (name, prop_schema) in props.iter() {
                        let normalized = normalize_schema_for_openai(prop_schema);
                        let final_schema = if required_set.contains(name) {
                            normalized
                        } else {
                            make_nullable(normalized)
                        };
                        new_props.insert(name.clone(), final_schema);
                    }

                    let required_all: Vec<serde_json::Value> = new_props
                        .keys()
                        .map(|k| serde_json::Value::String(k.clone()))
                        .collect();

                    new_map.insert("properties".to_string(), serde_json::Value::Object(new_props));
                    new_map.insert("required".to_string(), serde_json::Value::Array(required_all));
                    new_map.insert("additionalProperties".to_string(), serde_json::Value::Bool(false));
                    new_map.insert("type".to_string(), serde_json::Value::String("object".to_string()));
                }
            }

            serde_json::Value::Object(new_map)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(normalize_schema_for_openai).collect())
        }
        _ => schema.clone(),
    }
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

    // 构建响应格式（根据模型决定使用 json_schema 或 json_object）
    let response_format = params.response_json_schema.as_ref().map(|schema| {
        match select_openai_structured_output_mode(&params.model) {
            OpenAIStructuredOutputMode::JsonSchema => {
                println!("[Rust] OpenAI response_format: json_schema (strict)");
                OpenAIResponseFormat {
                    format_type: "json_schema".to_string(),
                    json_schema: Some(OpenAIJsonSchema {
                        name: "response".to_string(),
                        schema: normalize_schema_for_openai(schema),
                        strict: true,
                    }),
                }
            }
            OpenAIStructuredOutputMode::JsonObject => {
                println!("[Rust] OpenAI response_format: json_object");
                OpenAIResponseFormat {
                    format_type: "json_object".to_string(),
                    json_schema: None,
                }
            }
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

// ==================== OpenAI Responses API 代理命令 ====================

#[tauri::command]
pub async fn openai_responses(params: LLMRequestParams) -> LLMResult {
    println!("[Rust] openai_responses called");
    println!("[Rust] base_url: {}", params.base_url);
    println!("[Rust] model: {}", params.model);

    // 构建输入内容
    let mut content: Vec<OpenAIResponsesInputContent> = vec![
        OpenAIResponsesInputContent::InputText { text: params.prompt.clone() }
    ];

    if let Some(files) = &params.files {
        for file in files {
            if file.mime_type.starts_with("image/") {
                content.push(OpenAIResponsesInputContent::InputImage {
                    image_url: OpenAIImageUrl {
                        url: format!("data:{};base64,{}", file.mime_type, file.data),
                    },
                });
            }
        }
    }

    let input = vec![OpenAIResponsesInputItem {
        item_type: "message".to_string(),
        role: "user".to_string(),
        content,
    }];

    // 构建 text.format（结构化输出）
    let text = params.response_json_schema.as_ref().map(|schema| {
        match select_openai_structured_output_mode(&params.model) {
            OpenAIStructuredOutputMode::JsonSchema => {
                println!("[Rust] OpenAI Responses text.format: json_schema (strict)");
                OpenAIResponsesText {
                    format: OpenAIResponsesTextFormat {
                        format_type: "json_schema".to_string(),
                        name: Some("response".to_string()),
                        schema: Some(normalize_schema_for_openai(schema)),
                        strict: Some(true),
                    },
                }
            }
            OpenAIStructuredOutputMode::JsonObject => {
                println!("[Rust] OpenAI Responses text.format: json_object");
                OpenAIResponsesText {
                    format: OpenAIResponsesTextFormat {
                        format_type: "json_object".to_string(),
                        name: None,
                        schema: None,
                        strict: None,
                    },
                }
            }
        }
    });

    // 构建请求体
    let request_body = OpenAIResponsesRequest {
        model: params.model.clone(),
        input,
        instructions: params.system_prompt.clone(),
        temperature: params.temperature,
        max_output_tokens: params.max_tokens,
        text,
    };

    // 构建 URL
    let url = format!(
        "{}/v1/responses",
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
    println!("[Rust] Sending OpenAI Responses request...");
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

    let responses_response: OpenAIResponsesResponse = match serde_json::from_str(&response_text) {
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
    if let Some(err) = responses_response.error {
        return LLMResult {
            success: false,
            content: None,
            error: Some(err.message),
        };
    }

    // 提取内容
    let mut text_chunks: Vec<String> = Vec::new();
    let mut refusal: Option<String> = None;

    if let Some(outputs) = responses_response.output {
        for item in outputs {
            if item.item_type == "message" {
                if let Some(contents) = item.content {
                    for c in contents {
                        if c.content_type == "output_text" {
                            if let Some(t) = c.text {
                                text_chunks.push(t);
                            }
                        } else if c.content_type == "refusal" {
                            if let Some(r) = c.refusal {
                                refusal = Some(r);
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(r) = refusal {
        return LLMResult {
            success: false,
            content: None,
            error: Some(r),
        };
    }

    let content = if text_chunks.is_empty() {
        None
    } else {
        Some(text_chunks.join(""))
    };

    if content.is_none() {
        return LLMResult {
            success: false,
            content: None,
            error: Some("API 未返回有效内容".to_string()),
        };
    }

    println!("[Rust] OpenAI Responses result: content length = {}", content.as_ref().map(|c| c.len()).unwrap_or(0));

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
