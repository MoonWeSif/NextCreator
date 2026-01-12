mod storage;
mod gemini;
mod ocr_inpaint;
mod llm;
mod video;
mod dalle;

use storage::*;
use gemini::*;
use ocr_inpaint::*;
use llm::*;
use video::*;
use dalle::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_image,
            read_image,
            read_image_metadata,
            delete_image,
            delete_canvas_images,
            get_storage_stats,
            clear_cache,
            clear_all_images,
            get_storage_path,
            list_canvas_images,
            gemini_generate_content,
            gemini_generate_text,
            process_ppt_page,
            test_ocr_connection,
            test_inpaint_connection,
            // LLM 代理命令
            openai_chat_completion,
            claude_chat_completion,
            // 视频服务代理命令
            video_create_task,
            video_get_status,
            video_get_content,
            // Veo 视频服务命令
            veo_create_task,
            veo_get_status,
            veo_get_content,
            // Kling 视频服务命令
            kling_create_task,
            kling_get_status,
            kling_get_content,
            kling_download_video,
            // DALL-E 图片生成命令
            dalle_generate_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
