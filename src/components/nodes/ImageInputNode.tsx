import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ImagePlus, Upload, X, Maximize2 } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { getImageUrl } from "@/services/fileStorageService";
import type { ImageInputNodeData } from "@/types";

// 定义节点类型
type ImageInputNode = Node<ImageInputNodeData>;

// 图片输入节点
export const ImageInputNode = memo(({ id, data, selected }: NodeProps<ImageInputNode>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];

        // 延迟存储策略：只在内存中保留 base64，在生成时才保存到文件系统
        updateNodeData<ImageInputNodeData>(id, {
          imageData: base64,
          fileName: file.name,
          imagePath: undefined,  // 延迟保存，生成时才创建文件
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleClearImage = useCallback(() => {
    updateNodeData<ImageInputNodeData>(id, {
      imageData: undefined,
      fileName: undefined,
      imagePath: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  return (
  <>
    <div
      className={`
        w-[200px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
        ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
      `}
    >
      {/* 节点头部 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-lg">
        <ImagePlus className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>

      {/* 节点内容 */}
      <div className="p-2 nodrag">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {data.imageData || data.imagePath ? (
          <div className="relative">
            <div
              className="w-full h-[120px] overflow-hidden rounded-lg bg-base-200 cursor-pointer group"
              onClick={() => setShowPreview(true)}
            >
              <img
                src={
                  data.imagePath
                    ? getImageUrl(data.imagePath)
                    : data.imageData
                    ? `data:image/png;base64,${data.imageData}`
                    : ""
                }
                alt="Input"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <button
              className="btn btn-circle btn-xs btn-error absolute top-1 right-1 opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClearImage();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="w-3 h-3" />
            </button>
            {data.fileName && (
              <p className="text-xs text-base-content/60 mt-1.5 truncate px-0.5">
                {data.fileName}
              </p>
            )}
          </div>
        ) : (
          <button
            className="btn btn-ghost w-full h-[120px] border-2 border-dashed border-base-300 hover:border-primary flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Upload className="w-6 h-6 text-base-content/40" />
            <span className="text-xs text-base-content/60">点击上传图片</span>
          </button>
        )}
      </div>

      {/* 输出端口 - image 类型 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-image"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>

    {/* 预览弹窗 */}
    {showPreview && (data.imageData || data.imagePath) && (
      <ImagePreviewModal
        imageData={data.imageData}
        imagePath={data.imagePath}
        onClose={() => setShowPreview(false)}
        fileName={data.fileName}
      />
    )}
  </>
  );
});

ImageInputNode.displayName = "ImageInputNode";
