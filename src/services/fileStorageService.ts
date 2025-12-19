/**
 * 文件存储服务
 * 使用 Tauri 命令将图片存储为独立文件，而不是 base64 存储在 IndexedDB 中
 */

import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

// 图片类型枚举
export type ImageType = "input" | "generated";

// 输入图片信息（用于元数据）
export interface InputImageInfo {
  path?: string;
  label: string;
}

// 图片元数据结构
export interface ImageMetadata {
  prompt?: string;
  input_images: InputImageInfo[];
  node_id?: string;
  canvas_id?: string;
  created_at: number;
}

// 图片信息类型
export interface ImageInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  created_at: number;
  canvas_id?: string;
  node_id?: string;
  image_type?: ImageType;
}

// 带元数据的图片信息
export interface ImageInfoWithMetadata extends ImageInfo {
  metadata?: ImageMetadata;
}

// 存储统计信息类型
export interface StorageStats {
  total_size: number;
  image_count: number;
  cache_size: number;
  images_by_canvas: CanvasImageStats[];
}

export interface CanvasImageStats {
  canvas_id: string;
  image_count: number;
  total_size: number;
}

/**
 * 保存图片到文件系统
 * @param base64Data - 图片的 base64 数据（不含 data:image/xxx;base64, 前缀）
 * @param canvasId - 可选的画布 ID，用于分组存储
 * @param nodeId - 可选的节点 ID
 * @param prompt - 可选的生成提示词
 * @param inputImages - 可选的输入图片信息
 * @param imageType - 可选的图片类型（input/generated）
 * @returns 图片信息
 */
export async function saveImage(
  base64Data: string,
  canvasId?: string,
  nodeId?: string,
  prompt?: string,
  inputImages?: InputImageInfo[],
  imageType?: ImageType
): Promise<ImageInfo> {
  return await invoke<ImageInfo>("save_image", {
    base64Data,
    canvasId,
    nodeId,
    prompt,
    inputImages,
    imageType,
  });
}

/**
 * 读取图片文件（返回 base64）
 * @param path - 图片文件路径
 * @returns base64 编码的图片数据
 */
export async function readImage(path: string): Promise<string> {
  return await invoke<string>("read_image", { path });
}

/**
 * 获取图片的可访问 URL
 * 使用 Tauri 的 convertFileSrc 将本地路径转换为 webview 可访问的 URL
 * @param path - 图片文件路径
 * @returns 可在 webview 中使用的 URL
 */
export function getImageUrl(path: string): string {
  return convertFileSrc(path);
}

/**
 * 删除图片文件
 * @param path - 图片文件路径
 */
export async function deleteImage(path: string): Promise<void> {
  await invoke("delete_image", { path });
}

/**
 * 删除画布的所有图片
 * @param canvasId - 画布 ID
 * @returns 删除的总大小（字节）
 */
export async function deleteCanvasImages(canvasId: string): Promise<number> {
  return await invoke<number>("delete_canvas_images", { canvasId });
}

/**
 * 获取存储统计信息
 * @returns 存储统计数据
 */
export async function getStorageStats(): Promise<StorageStats> {
  return await invoke<StorageStats>("get_storage_stats");
}

/**
 * 清理缓存
 * @returns 清理的大小（字节）
 */
export async function clearCache(): Promise<number> {
  return await invoke<number>("clear_cache");
}

/**
 * 清理所有图片
 * @returns 清理的大小（字节）
 */
export async function clearAllImages(): Promise<number> {
  return await invoke<number>("clear_all_images");
}

/**
 * 获取应用存储路径
 * @returns 存储目录路径
 */
export async function getStoragePath(): Promise<string> {
  return await invoke<string>("get_storage_path");
}

/**
 * 列出画布的所有图片（包含元数据）
 * @param canvasId - 画布 ID
 * @returns 图片信息列表（包含元数据）
 */
export async function listCanvasImages(canvasId: string): Promise<ImageInfoWithMetadata[]> {
  return await invoke<ImageInfoWithMetadata[]>("list_canvas_images", { canvasId });
}

/**
 * 读取单个图片的元数据
 * @param imagePath - 图片文件路径
 * @returns 图片元数据（如果存在）
 */
export async function readImageMetadata(imagePath: string): Promise<ImageMetadata | null> {
  return await invoke<ImageMetadata | null>("read_image_metadata", { imagePath });
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串（如 "1.5 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 检查是否在 Tauri 环境中运行
 * @returns 是否在 Tauri 环境中
 */
export function isTauriEnvironment(): boolean {
  // Tauri 2.x 使用 __TAURI_INTERNALS__ 而不是 __TAURI__
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}
