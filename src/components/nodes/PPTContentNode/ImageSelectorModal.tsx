import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Image } from "lucide-react";
import type { ConnectedImageInfo } from "./types";
import { getImageUrl } from "@/services/fileStorageService";

interface ImageSelectorModalProps {
  images: ConnectedImageInfo[];
  selectedIds: string[];
  excludeIds?: string[];  // 排除的图片 ID（如基底图）
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

// 图片选择器弹窗 - 网格布局，支持多选
export const ImageSelectorModal = memo(({
  images,
  selectedIds,
  excludeIds = [],
  onConfirm,
  onClose,
}: ImageSelectorModalProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // 可选的图片（排除指定的图片）
  const availableImages = images.filter(img => !excludeIds.includes(img.id));

  // 切换选中状态
  const toggleSelection = useCallback((id: string) => {
    setLocalSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  // 关闭弹窗（带动画）
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

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

  // 确认选择
  const handleConfirm = useCallback(() => {
    onConfirm(localSelectedIds);
    handleClose();
  }, [localSelectedIds, onConfirm, handleClose]);

  return createPortal(
    <div
      className={`
        fixed inset-0 flex items-center justify-center z-50
        transition-all duration-200 ease-out
        ${isVisible ? "bg-black/50" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          bg-base-100 rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col
          transition-all duration-200 ease-out
          ${isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <span className="font-medium">选择参考图片</span>
            <span className="text-xs text-base-content/50">
              (可选 {availableImages.length} 张)
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {availableImages.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <Image className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>没有可用的参考图片</p>
              <p className="text-xs mt-1">请先连接图片输入节点</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availableImages.map((img) => {
                const isSelected = localSelectedIds.includes(img.id);
                return (
                  <div
                    key={img.id}
                    className={`
                      relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${isSelected
                        ? "border-primary shadow-md"
                        : "border-base-300 hover:border-base-400"
                      }
                    `}
                    onClick={() => toggleSelection(img.id)}
                  >
                    {/* 图片 - 优先使用 imagePath，否则使用 imageData */}
                    <div className="aspect-video bg-base-200">
                      <img
                        src={
                          img.imagePath
                            ? getImageUrl(img.imagePath)
                            : img.imageData
                              ? `data:image/png;base64,${img.imageData}`
                              : undefined
                        }
                        alt={img.fileName || "图片"}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 选中标记 */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-content" />
                      </div>
                    )}

                    {/* 文件名 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="text-xs text-white truncate">
                        {img.fileName || `图片-${img.id.slice(0, 4)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-base-300 bg-base-200/30">
          <span className="text-sm text-base-content/60">
            已选择 {localSelectedIds.length} 张
          </span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              取消
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
              确认
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

ImageSelectorModal.displayName = "ImageSelectorModal";
