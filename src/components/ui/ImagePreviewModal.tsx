import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { getImageUrl, isTauriEnvironment, readImage } from "@/services/fileStorageService";
import { toast } from "@/stores/toastStore";

interface ImagePreviewModalProps {
  imageData?: string;      // base64 数据（可选）
  imagePath?: string;      // 文件路径（可选）
  onClose: () => void;
  fileName?: string;
}

export function ImagePreviewModal({ imageData, imagePath, onClose, fileName }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 获取图片 URL
  const imageUrl = imagePath
    ? (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      ? imagePath  // 外部 URL 直接使用
      : getImageUrl(imagePath)  // 本地路径使用 getImageUrl
    : imageData
    ? `data:image/png;base64,${imageData}`
    : "";

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // 处理背景点击，阻止事件冒泡
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到父级 Modal
    handleClose();
  }, [handleClose]);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      // 获取 base64 数据
      let base64Data: string;

      if (imageData) {
        base64Data = imageData;
      } else if (imagePath) {
        // 从文件路径读取 base64 数据
        base64Data = await readImage(imagePath);
      } else {
        toast.error("没有可下载的图片数据");
        return;
      }

      const defaultFileName = fileName || `next-creator-${Date.now()}.png`;

      if (isTauriEnvironment()) {
        // Tauri 环境：使用保存对话框
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");

        const filePath = await save({
          defaultPath: defaultFileName,
          filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }],
        });

        if (filePath) {
          // 将 base64 转换为 Uint8Array
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          await writeFile(filePath, bytes);
          toast.success(`图片已保存到: ${filePath.split("/").pop()}`);
        }
      } else {
        // 浏览器环境：使用传统下载
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${base64Data}`;
        link.download = defaultFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("图片下载已开始");
      }
    } catch (error) {
      console.error("下载失败:", error);
      toast.error(`下载失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsDownloading(false);
    }
  }, [imageData, imagePath, fileName, isDownloading]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // 使用 Portal 渲染到 body，避免被节点的 transform 影响
  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/80" : "bg-black/0"}
      `}
      onClick={handleBackgroundClick}
    >
      {/* 工具栏 */}
      <div
        className={`
          absolute top-4 right-4 flex items-center gap-2
          transition-all duration-200 ease-out
          ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
          onClick={handleZoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-sm min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
          onClick={handleZoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          className={`btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0 ${isDownloading ? "btn-disabled" : ""}`}
          onClick={handleDownload}
          disabled={isDownloading}
          title="下载图片"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
        <button
          className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-0"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 图片 */}
      <div
        className={`
          max-w-[90vw] max-h-[90vh] overflow-auto
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="transition-transform duration-200"
          style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
        />
      </div>

      {/* 提示 */}
      <div
        className={`
          absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm
          transition-all duration-200 ease-out
          ${isVisible && !isClosing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        点击背景或按 ESC 关闭
      </div>
    </div>,
    document.body
  );
}
