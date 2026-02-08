// 使用 Gemini 进行文字检测，自适应背景修复

pub mod batch_processor;
pub mod gemini_detector;
pub mod adaptive_inpainter;
pub mod mask_generator;
pub mod service;

// 重新导出服务模块中的 Tauri 命令
pub use service::*;
pub use batch_processor::{process_pages_batch, stop_batch_processing};
