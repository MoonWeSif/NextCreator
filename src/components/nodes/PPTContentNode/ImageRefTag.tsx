import { memo, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { getImageUrl } from "@/services/fileStorageService";

interface ImageRefTagProps {
  id: string;
  fileName: string;
  imageData: string;
  imagePath?: string;
  onRemove: (id: string) => void;
}

// 图片引用标签组件 - 显示缩略图和文件名，支持预览和删除
export const ImageRefTag = memo(({ id, fileName, imageData, imagePath, onRemove }: ImageRefTagProps) => {
  const [showPreview, setShowPreview] = useState(false);

  // 优先使用 imagePath，否则使用 imageData
  const imageSrc = imagePath
    ? getImageUrl(imagePath)
    : imageData
      ? `data:image/png;base64,${imageData}`
      : undefined;

  return (
    <>
      <div className="inline-flex items-center gap-1.5 bg-base-200 rounded-lg pr-1 group hover:bg-base-300 transition-colors">
        {/* 缩略图 */}
        <div
          className="relative w-8 h-8 rounded-l-lg overflow-hidden cursor-pointer"
          onClick={() => setShowPreview(true)}
        >
          <img
            src={imageSrc}
            alt={fileName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* 文件名 */}
        <span
          className="text-xs text-base-content/70 max-w-[80px] truncate cursor-pointer"
          onClick={() => setShowPreview(true)}
          title={fileName}
        >
          {fileName}
        </span>

        {/* 删除按钮 */}
        <button
          className="p-0.5 rounded hover:bg-error/20 text-base-content/40 hover:text-error transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          title="移除"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* 预览弹窗 */}
      {showPreview && (
        <ImagePreviewModal
          imageData={imageData}
          imagePath={imagePath}
          fileName={fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
});

ImageRefTag.displayName = "ImageRefTag";
