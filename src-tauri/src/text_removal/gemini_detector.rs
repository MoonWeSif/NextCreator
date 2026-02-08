// Gemini 文字检测器
// 使用 Gemini API 进行两轮调用检测 PPT 图片中的文字

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// 检测到的文本区域
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRegion {
    pub box_2d: [i32; 4],  // [ymin, xmin, ymax, xmax]，归一化到 0-1000
    pub label: String,
    #[serde(default)]
    pub polygon: Vec<Vec<i32>>,  // [[y1,x1], [y2,x2], ...]，归一化到 0-1000
}

/// 检测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextDetectionResult {
    pub regions: Vec<TextRegion>,
    pub raw_response: String,
}

/// Gemini API 配置
#[derive(Debug, Clone)]
pub struct GeminiConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

/// 第一轮检测提示词（代码执行 + 视觉思维）
const ROUND1_PROMPT: &str = r#"
分析这张图片中的所有文字区域。

请使用 Python 代码来精确计算每个文字区域的边界框坐标。

要求：
1. 识别图片中所有可见的文字（中文、英文、数字等）
2. 对于每个文字区域，计算其精确的边界框
3. 边界框格式：[ymin, xmin, ymax, xmax]，坐标归一化到 0-1000 范围
4. 边界框应该紧密包围文字，不要包含过多的背景区域
5. 最后输出一个 JSON 格式的结果
6. 不要漏掉非常小、模糊、残缺的文字或笔画；即使无法读出内容，也要标注区域
7. 注意图标旁、箭头旁、角落、竖排/旋转的文字

输出格式示例：
```json
[
  {"box_2d": [100, 200, 150, 400], "label": "文字内容1"},
  {"box_2d": [300, 100, 350, 500], "label": "文字内容2"}
]
```

请先用代码分析图片，然后输出最终的 JSON 结果。
"#;

/// Gemini API 响应体
#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<Candidate>>,
    error: Option<GeminiError>,
}

#[derive(Debug, Deserialize)]
struct Candidate {
    content: Option<ResponseContent>,
}

#[derive(Debug, Deserialize)]
struct ResponseContent {
    parts: Vec<ResponsePart>,
}

#[derive(Debug, Deserialize)]
struct ResponsePart {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GeminiError {
    message: String,
}

/// 第二轮结构化输出结果
#[derive(Debug, Deserialize)]
struct StructuredResult {
    regions: Vec<TextRegion>,
}

/// 文字样式信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextStyleInfo {
    /// 对应的区域索引（与传入 regions 顺序一致，0-based）
    pub index: usize,
    /// 颜色（#RRGGBB）
    pub color_hex: String,
    /// 字号（磅）
    pub font_size: i32,
    /// 是否粗体
    pub is_bold: bool,
}

/// 样式结构化输出结果
#[derive(Debug, Deserialize)]
struct StructuredStyleResult {
    styles: Vec<TextStyleInfo>,
}

/// 解析可能被 markdown 包裹的 JSON
fn parse_json(text: &str) -> String {
    let lines: Vec<&str> = text.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if *line == "```json" {
            let rest = lines[i + 1..].join("\n");
            if let Some(end) = rest.find("```") {
                return rest[..end].trim().to_string();
            }
        }
    }
    text.trim().to_string()
}

/// 检查返回内容是否包含有效的检测结果结构
fn is_valid_detection_result(text: &str) -> bool {
    if !text.contains("box_2d") {
        return false;
    }

    let json_str = parse_json(text);
    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&json_str) {
        if let Some(arr) = data.as_array() {
            return arr.iter().any(|item| {
                item.is_object() && item.get("box_2d").is_some()
            });
        }
    }
    false
}

/// 执行文字检测（两轮调用）
pub async fn detect_text(
    image_base64: &str,
    config: &GeminiConfig,
) -> Result<TextDetectionResult, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let url = format!(
        "{}/v1beta/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        config.api_key
    );

    // 第一轮：自由格式输出（带重试）
    println!("[Rust] Gemini 第一轮检测...");
    let round1_result = detect_text_round1(&client, &url, image_base64).await?;
    println!("[Rust] 第一轮结果长度: {} 字符, 有效: {}", round1_result.text.len(), round1_result.is_valid);

    // 第二轮：结构化规范化（无论第一轮是否包含 box_2d 都执行）
    println!("[Rust] Gemini 第二轮结构化...");
    let regions = normalize_detection_result(&client, &url, &round1_result.text).await?;
    println!("[Rust] 最终检测到 {} 个文本区域", regions.len());

    Ok(TextDetectionResult {
        regions,
        raw_response: round1_result.text,
    })
}

/// 提取文字样式信息（颜色、字号、粗细）
pub async fn extract_text_styles(
    image_base64: &str,
    regions: &[TextRegion],
    config: &GeminiConfig,
) -> Result<Vec<TextStyleInfo>, String> {
    if regions.is_empty() {
        return Ok(vec![]);
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let url = format!(
        "{}/v1beta/models/{}:generateContent?key={}",
        config.base_url.trim_end_matches('/'),
        config.model,
        config.api_key
    );

    let mut list_lines = Vec::new();
    for (i, r) in regions.iter().enumerate() {
        let label: String = r.label.chars().take(40).collect();
        list_lines.push(format!("{}. {}", i, label));
    }
    let list_text = list_lines.join("\n");

    let prompt = format!(r##"
分析这张图片中以下文字区域的样式信息：

{}

请输出每个区域的：
1. 颜色（十六进制，如 #FFFFFF / #333333）
2. 估计字号（磅值）
3. 是否粗体

要求：
- index 为区域序号（与上面列表一致，0-based）
- 如果无法判断，请使用默认值：color_hex="#333333", font_size=24, is_bold=false
"##, list_text);

    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "styles": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": { "type": "integer" },
                        "color_hex": { "type": "string" },
                        "font_size": { "type": "integer" },
                        "is_bold": { "type": "boolean" }
                    },
                    "required": ["index", "color_hex", "font_size", "is_bold"]
                }
            }
        },
        "required": ["styles"]
    });

    let request_body = serde_json::json!({
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": image_base64
                    }
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    });

    let response = client
        .post(url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("样式提取请求失败: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("API 返回错误 ({}): {}", status, response_text));
    }

    let gemini_response: GeminiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {} - {}", e, response_text))?;

    if let Some(error) = gemini_response.error {
        return Err(format!("Gemini API 错误: {}", error.message));
    }

    let text = gemini_response.candidates
        .as_ref()
        .and_then(|c| c.first())
        .and_then(|c| c.content.as_ref())
        .and_then(|c| c.parts.first())
        .and_then(|p| p.text.as_ref())
        .ok_or("样式提取无响应")?;

    let result: StructuredStyleResult = serde_json::from_str(text)
        .map_err(|e| format!("解析样式结果失败: {} - {}", e, text))?;

    Ok(result.styles)
}

/// 第一轮调用结果
struct Round1Result {
    /// 原始响应文本
    text: String,
    /// 是否包含有效的 box_2d 结构
    is_valid: bool,
}

/// 第一轮调用：识别文字位置（自由格式输出，带重试）
/// 即使结果不包含 box_2d，也返回原始响应用于第二轮处理
async fn detect_text_round1(
    client: &Client,
    url: &str,
    image_base64: &str,
) -> Result<Round1Result, String> {
    let request_body = serde_json::json!({
        "contents": [{
            "parts": [
                {"text": ROUND1_PROMPT},
                {
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": image_base64
                    }
                }
            ]
        }],
        "tools": [{
            "codeExecution": {}
        }],
        "generationConfig": {
            "thinkingConfig": {
                "thinkingLevel": "high"
            }
        }
    });

    let max_retries = 3;
    let mut last_raw_result: Option<String> = None;

    for attempt in 0..max_retries {
        match client.post(url).json(&request_body).send().await {
            Ok(resp) => {
                let status = resp.status();
                let response_text = resp.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

                if !status.is_success() {
                    println!("[Rust] 第一轮尝试 {}/{} API 错误: {}", attempt + 1, max_retries, response_text);
                    if attempt < max_retries - 1 {
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        continue;
                    }
                    return Err(format!("API 返回错误 ({}): {}", status, response_text));
                }

                match serde_json::from_str::<GeminiResponse>(&response_text) {
                    Ok(response) => {
                        if let Some(error) = response.error {
                            println!("[Rust] 第一轮尝试 {}/{} API 错误: {}", attempt + 1, max_retries, error.message);
                            if attempt < max_retries - 1 {
                                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                                continue;
                            }
                            return Err(format!("Gemini API 错误: {}", error.message));
                        }

                        if let Some(parts) = response.candidates
                            .as_ref()
                            .and_then(|c| c.first())
                            .and_then(|c| c.content.as_ref())
                            .map(|c| &c.parts)
                        {
                            let text = parts
                                .iter()
                                .filter_map(|p| p.text.as_deref())
                                .collect::<Vec<_>>()
                                .join("\n");
                            if text.is_empty() {
                                continue;
                            }
                            // 保存原始响应
                            last_raw_result = Some(text.clone());

                            if is_valid_detection_result(&text) {
                                println!("[Rust] 第一轮尝试 {}/{}: 成功，检测到有效结果", attempt + 1, max_retries);
                                return Ok(Round1Result {
                                    text: text.clone(),
                                    is_valid: true,
                                });
                            } else {
                                println!("[Rust] 第一轮尝试 {}/{}: 结果不含 box_2d，将交给第二轮处理", attempt + 1, max_retries);
                                // 继续重试，但保存响应以备用
                            }
                        }
                    }
                    Err(e) => {
                        println!("[Rust] 第一轮尝试 {}/{} 解析失败: {}", attempt + 1, max_retries, e);
                    }
                }
            }
            Err(e) => {
                println!("[Rust] 第一轮尝试 {}/{} 网络失败: {}", attempt + 1, max_retries, e);
            }
        }

        if attempt < max_retries - 1 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    // 如果有原始响应，即使不包含 box_2d，也返回给第二轮处理
    if let Some(text) = last_raw_result {
        println!("[Rust] 第一轮未获得有效 box_2d 结果，将原始响应传给第二轮");
        return Ok(Round1Result {
            text,
            is_valid: false,
        });
    }

    Err("第一轮调用失败：未获得任何有效响应".to_string())
}

/// 第二轮调用：规范化输出格式（结构化输出）
async fn normalize_detection_result(
    client: &Client,
    url: &str,
    raw_result: &str,
) -> Result<Vec<TextRegion>, String> {
    let prompt = format!(r#"
请解析以下文字检测结果，转换为规范化的格式。

原始检测结果：
{}

要求：
1. 提取每个文字区域的 box_2d（边界框坐标 [ymin, xmin, ymax, xmax]）
2. 提取 label（文字内容或描述）
3. 如果有 mask 或 polygon 数据，转换为 polygon 格式（多边形顶点列表 [[y1,x1], [y2,x2], ...]）
4. 所有坐标保持 0-1000 的归一化范围
5. 确保边界框紧密包围文字区域
6. 若有极小或难以识别的字形残留，也需要保留其区域
"#, raw_result);

    // JSON Schema
    let schema = serde_json::json!({
        "type": "object",
        "properties": {
            "regions": {
                "type": "array",
                "description": "所有检测到的文字区域",
                "items": {
                    "type": "object",
                    "properties": {
                        "box_2d": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "边界框 [ymin, xmin, ymax, xmax]，归一化到 0-1000"
                        },
                        "label": {
                            "type": "string",
                            "description": "文字内容或描述"
                        },
                        "polygon": {
                            "type": "array",
                            "items": {
                                "type": "array",
                                "items": {"type": "integer"}
                            },
                            "description": "多边形顶点坐标列表 [[y1,x1], [y2,x2], ...]，归一化到 0-1000"
                        }
                    },
                    "required": ["box_2d", "label", "polygon"]
                }
            }
        },
        "required": ["regions"]
    });

    let request_body = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    });

    let response = client
        .post(url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("第二轮请求失败: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("API 返回错误 ({}): {}", status, response_text));
    }

    let gemini_response: GeminiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {} - {}", e, response_text))?;

    if let Some(error) = gemini_response.error {
        return Err(format!("Gemini API 错误: {}", error.message));
    }

    let text = gemini_response.candidates
        .as_ref()
        .and_then(|c| c.first())
        .and_then(|c| c.content.as_ref())
        .and_then(|c| c.parts.first())
        .and_then(|p| p.text.as_ref())
        .ok_or("第二轮调用无响应")?;

    let result: StructuredResult = serde_json::from_str(text)
        .map_err(|e| format!("解析结构化结果失败: {} - {}", e, text))?;

    println!("[Rust] 第二轮规范化完成: {} 个文字块", result.regions.len());

    Ok(result.regions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_json() {
        let text = r#"
这是一些文字

```json
[{"box_2d": [0, 0, 100, 100]}]
```

更多文字
"#;
        let json = parse_json(text);
        assert_eq!(json, r#"[{"box_2d": [0, 0, 100, 100]}]"#);
    }

    #[test]
    fn test_is_valid_detection_result() {
        let valid = r#"[{"box_2d": [0, 0, 100, 100], "label": "test"}]"#;
        assert!(is_valid_detection_result(valid));

        let invalid = r#"{"text": "no box_2d here"}"#;
        assert!(!is_valid_detection_result(invalid));
    }
}
