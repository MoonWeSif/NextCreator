use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

// 图片类型枚举
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ImageType {
    Input,      // 用户上传的输入图片
    Generated,  // AI 生成的图片
}

// 图片信息结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub id: String,
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: i64,
    pub canvas_id: Option<String>,
    pub node_id: Option<String>,
    pub image_type: Option<ImageType>,  // 新增：图片类型
}

// 图片元数据结构（持久化存储）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageMetadata {
    pub prompt: Option<String>,
    pub input_images: Vec<InputImageInfo>,
    pub node_id: Option<String>,
    pub canvas_id: Option<String>,
    pub created_at: i64,
}

// 输入图片信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InputImageInfo {
    pub path: Option<String>,
    pub label: String,
}

// 带元数据的图片信息（用于前端）
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfoWithMetadata {
    pub id: String,
    pub filename: String,
    pub path: String,
    pub size: u64,
    pub created_at: i64,
    pub canvas_id: Option<String>,
    pub node_id: Option<String>,
    pub image_type: Option<ImageType>,  // 新增：图片类型
    pub metadata: Option<ImageMetadata>,
}

// 存储统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct StorageStats {
    pub total_size: u64,
    pub image_count: usize,
    pub cache_size: u64,
    pub images_by_canvas: Vec<CanvasImageStats>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CanvasImageStats {
    pub canvas_id: String,
    pub image_count: usize,
    pub total_size: u64,
}

// 获取应用数据目录
fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))
}

// 获取图片存储目录
fn get_images_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = get_app_data_dir(app)?;
    let images_dir = app_data.join("images");
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| format!("创建图片目录失败: {}", e))?;
    }
    Ok(images_dir)
}

// 获取缓存目录
fn get_cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = get_app_data_dir(app)?;
    let cache_dir = app_data.join("cache");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir).map_err(|e| format!("创建缓存目录失败: {}", e))?;
    }
    Ok(cache_dir)
}

// 保存图片（从 base64）- 同时保存元数据
#[tauri::command]
pub fn save_image(
    app: tauri::AppHandle,
    base64_data: String,
    canvas_id: Option<String>,
    node_id: Option<String>,
    prompt: Option<String>,
    input_images: Option<Vec<InputImageInfo>>,
    image_type: Option<ImageType>,  // 新增：图片类型
) -> Result<ImageInfo, String> {
    let images_dir = get_images_dir(&app)?;

    // 根据 canvas_id 创建子目录
    let target_dir = if let Some(ref cid) = canvas_id {
        let canvas_dir = images_dir.join(cid);
        if !canvas_dir.exists() {
            fs::create_dir_all(&canvas_dir).map_err(|e| format!("创建画布目录失败: {}", e))?;
        }
        canvas_dir
    } else {
        images_dir
    };

    // 解码 base64
    let image_data = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 生成唯一文件名
    let id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().timestamp();
    let filename = format!("{}_{}.png", id, timestamp);
    let file_path = target_dir.join(&filename);

    // 写入图片文件
    fs::write(&file_path, &image_data).map_err(|e| format!("写入文件失败: {}", e))?;

    // 保存元数据文件（如果有提示词或输入图片）
    if prompt.is_some() || input_images.is_some() {
        let metadata = ImageMetadata {
            prompt: prompt.clone(),
            input_images: input_images.unwrap_or_default(),
            node_id: node_id.clone(),
            canvas_id: canvas_id.clone(),
            created_at: timestamp,
        };

        let meta_filename = format!("{}_{}.meta.json", id, timestamp);
        let meta_path = target_dir.join(&meta_filename);

        let meta_json = serde_json::to_string_pretty(&metadata)
            .map_err(|e| format!("序列化元数据失败: {}", e))?;

        fs::write(&meta_path, meta_json).map_err(|e| format!("写入元数据失败: {}", e))?;
    }

    let path_str = file_path
        .to_str()
        .ok_or("路径转换失败")?
        .to_string();

    Ok(ImageInfo {
        id,
        filename,
        path: path_str,
        size: image_data.len() as u64,
        created_at: timestamp,
        canvas_id,
        node_id,
        image_type,  // 返回图片类型
    })
}

// 读取图片（返回 base64）
#[tauri::command]
pub fn read_image(path: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    Ok(general_purpose::STANDARD.encode(&data))
}

// 删除图片
#[tauri::command]
pub fn delete_image(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))
}

// 删除画布的所有图片
#[tauri::command]
pub fn delete_canvas_images(app: tauri::AppHandle, canvas_id: String) -> Result<u64, String> {
    let images_dir = get_images_dir(&app)?;
    let canvas_dir = images_dir.join(&canvas_id);

    if !canvas_dir.exists() {
        return Ok(0);
    }

    let mut deleted_size: u64 = 0;

    // 遍历并删除目录中的所有文件
    if let Ok(entries) = fs::read_dir(&canvas_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    deleted_size += metadata.len();
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }

    // 删除空目录
    let _ = fs::remove_dir(&canvas_dir);

    Ok(deleted_size)
}

// 获取存储统计信息
#[tauri::command]
pub fn get_storage_stats(app: tauri::AppHandle) -> Result<StorageStats, String> {
    let images_dir = get_images_dir(&app)?;
    let cache_dir = get_cache_dir(&app)?;

    let mut total_size: u64 = 0;
    let mut image_count: usize = 0;
    let mut images_by_canvas: Vec<CanvasImageStats> = Vec::new();

    // 统计图片目录
    if images_dir.exists() {
        if let Ok(entries) = fs::read_dir(&images_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // 这是一个画布目录
                    let canvas_id = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let mut canvas_size: u64 = 0;
                    let mut canvas_count: usize = 0;

                    if let Ok(files) = fs::read_dir(&path) {
                        for file in files.flatten() {
                            if let Ok(metadata) = file.metadata() {
                                if metadata.is_file() {
                                    // 只统计图片文件，排除元数据文件
                                    let filename = file
                                        .file_name()
                                        .to_str()
                                        .unwrap_or("")
                                        .to_string();
                                    if !filename.ends_with(".meta.json") {
                                        canvas_size += metadata.len();
                                        canvas_count += 1;
                                    }
                                }
                            }
                        }
                    }

                    total_size += canvas_size;
                    image_count += canvas_count;

                    images_by_canvas.push(CanvasImageStats {
                        canvas_id,
                        image_count: canvas_count,
                        total_size: canvas_size,
                    });
                } else if path.is_file() {
                    // 根目录的图片
                    if let Ok(metadata) = entry.metadata() {
                        total_size += metadata.len();
                        image_count += 1;
                    }
                }
            }
        }
    }

    // 统计缓存目录
    let mut cache_size: u64 = 0;
    if cache_dir.exists() {
        cache_size = calculate_dir_size(&cache_dir);
    }

    Ok(StorageStats {
        total_size,
        image_count,
        cache_size,
        images_by_canvas,
    })
}

// 清理缓存
#[tauri::command]
pub fn clear_cache(app: tauri::AppHandle) -> Result<u64, String> {
    let cache_dir = get_cache_dir(&app)?;
    let cleared_size = calculate_dir_size(&cache_dir);

    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir).map_err(|e| format!("清理缓存失败: {}", e))?;
        fs::create_dir_all(&cache_dir).map_err(|e| format!("重建缓存目录失败: {}", e))?;
    }

    Ok(cleared_size)
}

// 清理所有图片
#[tauri::command]
pub fn clear_all_images(app: tauri::AppHandle) -> Result<u64, String> {
    let images_dir = get_images_dir(&app)?;
    let cleared_size = calculate_dir_size(&images_dir);

    if images_dir.exists() {
        fs::remove_dir_all(&images_dir).map_err(|e| format!("清理图片失败: {}", e))?;
        fs::create_dir_all(&images_dir).map_err(|e| format!("重建图片目录失败: {}", e))?;
    }

    Ok(cleared_size)
}

// 获取应用数据目录路径（供前端显示）
#[tauri::command]
pub fn get_storage_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = get_app_data_dir(&app)?;
    app_data
        .to_str()
        .map(|s| s.to_string())
        .ok_or("路径转换失败".to_string())
}

// 列出画布的所有图片（带元数据）
#[tauri::command]
pub fn list_canvas_images(
    app: tauri::AppHandle,
    canvas_id: String,
) -> Result<Vec<ImageInfoWithMetadata>, String> {
    let images_dir = get_images_dir(&app)?;
    let canvas_dir = images_dir.join(&canvas_id);

    let mut images: Vec<ImageInfoWithMetadata> = Vec::new();

    if !canvas_dir.exists() {
        return Ok(images);
    }

    if let Ok(entries) = fs::read_dir(&canvas_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let filename = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // 跳过元数据文件，只处理图片文件
                if filename.ends_with(".meta.json") {
                    continue;
                }

                if let Ok(file_metadata) = entry.metadata() {
                    // 从文件名解析 ID 和时间戳（格式: {id}_{timestamp}.png）
                    let parts: Vec<&str> = filename.split('_').collect();
                    let id = parts.first().unwrap_or(&"unknown").to_string();

                    // 尝试从文件名获取时间戳，否则使用文件创建时间
                    let created_at = if parts.len() >= 2 {
                        parts[1]
                            .trim_end_matches(".png")
                            .parse::<i64>()
                            .unwrap_or_else(|_| {
                                file_metadata
                                    .created()
                                    .map(|t| {
                                        t.duration_since(std::time::UNIX_EPOCH)
                                            .map(|d| d.as_secs() as i64)
                                            .unwrap_or(0)
                                    })
                                    .unwrap_or(0)
                            })
                    } else {
                        file_metadata
                            .created()
                            .map(|t| {
                                t.duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_secs() as i64)
                                    .unwrap_or(0)
                            })
                            .unwrap_or(0)
                    };

                    // 尝试读取对应的元数据文件
                    let meta_filename = filename.replace(".png", ".meta.json");
                    let meta_path = canvas_dir.join(&meta_filename);
                    let metadata = if meta_path.exists() {
                        fs::read_to_string(&meta_path)
                            .ok()
                            .and_then(|content| serde_json::from_str::<ImageMetadata>(&content).ok())
                    } else {
                        None
                    };

                    // 从元数据中获取 node_id
                    let node_id = metadata.as_ref().and_then(|m| m.node_id.clone());

                    // 推断图片类型：有 prompt 说明是生成的，否则可能是输入的
                    let image_type = if metadata.as_ref().and_then(|m| m.prompt.as_ref()).is_some() {
                        Some(ImageType::Generated)
                    } else if metadata.is_none() {
                        // 旧数据没有元数据，可能是输入图片
                        Some(ImageType::Input)
                    } else {
                        None
                    };

                    images.push(ImageInfoWithMetadata {
                        id,
                        filename,
                        path: path.to_str().unwrap_or("").to_string(),
                        size: file_metadata.len(),
                        created_at,
                        canvas_id: Some(canvas_id.clone()),
                        node_id,
                        image_type,
                        metadata,
                    });
                }
            }
        }
    }

    // 按创建时间排序（最新的在前）
    images.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(images)
}

// 读取单个图片的元数据
#[tauri::command]
pub fn read_image_metadata(image_path: String) -> Result<Option<ImageMetadata>, String> {
    // 从图片路径构造元数据文件路径
    let meta_path = image_path.replace(".png", ".meta.json");

    if !std::path::Path::new(&meta_path).exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("读取元数据失败: {}", e))?;

    let metadata: ImageMetadata = serde_json::from_str(&content)
        .map_err(|e| format!("解析元数据失败: {}", e))?;

    Ok(Some(metadata))
}

// 辅助函数：计算目录大小
fn calculate_dir_size(path: &PathBuf) -> u64 {
    let mut size: u64 = 0;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                size += calculate_dir_size(&entry_path);
            } else if let Ok(metadata) = entry.metadata() {
                size += metadata.len();
            }
        }
    }

    size
}
