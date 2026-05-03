import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ImagePlus, Upload, X, Maximize2, Paintbrush } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { MaskEditorModal } from "@/components/ui/MaskEditorModal";
import { getImageUrl, saveImage } from "@/services/fileStorageService";
import type { ImageInputNodeData } from "@/types";

// 定义节点类型
type ImageInputNode = Node<ImageInputNodeData>;

// 图片输入节点
export const ImageInputNode = memo(({ id, data, selected }: NodeProps<ImageInputNode>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const isOverlay = data.__renderOverlay === true;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const { activeCanvasId } = useCanvasStore.getState();

        if (activeCanvasId) {
          try {
            const imageInfo = await saveImage(
              base64,
              activeCanvasId,
              id,
              undefined,
              undefined,
              "input"
            );
            updateNodeData<ImageInputNodeData>(id, {
              imageData: undefined,
              fileName: file.name,
              imagePath: imageInfo.path,
            });
          } catch (err) {
            console.warn("保存图片到文件系统失败，回退到内存存储:", err);
            updateNodeData<ImageInputNodeData>(id, {
              imageData: base64,
              fileName: file.name,
              imagePath: undefined,
            });
          }
        } else {
          updateNodeData<ImageInputNodeData>(id, {
            imageData: base64,
            fileName: file.name,
            imagePath: undefined,
          });
        }
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
      maskImageData: undefined,
      maskImagePath: undefined,
      hasMask: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  const handleMaskSave = useCallback(
    async (maskBase64: string) => {
      const { activeCanvasId } = useCanvasStore.getState();
      if (activeCanvasId) {
        try {
          const maskInfo = await saveImage(
            maskBase64,
            activeCanvasId,
            id,
            undefined,
            undefined,
            "input"
          );
          updateNodeData<ImageInputNodeData>(id, {
            maskImageData: undefined,
            maskImagePath: maskInfo.path,
            hasMask: true,
          });
        } catch {
          updateNodeData<ImageInputNodeData>(id, {
            maskImageData: maskBase64,
            maskImagePath: undefined,
            hasMask: true,
          });
        }
      } else {
        updateNodeData<ImageInputNodeData>(id, {
          maskImageData: maskBase64,
          maskImagePath: undefined,
          hasMask: true,
        });
      }
    },
    [id, updateNodeData]
  );

  return (
  <>
    <div
      className={`
        nc-node-card nc-node-accent-green w-[200px] transition-all
        ${selected ? "nc-node-card-selected" : ""}
      `}
    >
      {/* 节点头部 */}
      <div className="nc-node-header nc-node-header-accent justify-start gap-2">
        <span className="nc-node-header-icon">
          <ImagePlus className="w-4 h-4" />
        </span>
        <span className="text-sm font-semibold truncate">{data.label}</span>
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
          <div>
            {/* 图片预览 - 自适应高度展示完整图片 */}
            <div
              className="w-full overflow-hidden rounded-lg nc-soft-surface cursor-pointer group relative"
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
                className="w-full h-auto block"
              />
              {/* 蒙版叠加层 - 直接显示红色标记 */}
              {data.hasMask && (data.maskImagePath || data.maskImageData) && (
                <img
                  src={
                    data.maskImagePath
                      ? getImageUrl(data.maskImagePath)
                      : `data:image/png;base64,${data.maskImageData}`
                  }
                  alt=""
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
            {/* 操作栏 */}
            <div className="flex items-center mt-1.5 gap-1">
              {data.fileName && (
                <p className="text-xs text-base-content/60 truncate flex-1">
                  {data.fileName}
                </p>
              )}
              <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                <button
                  className={`btn btn-circle btn-xs ${data.hasMask ? "btn-error" : "btn-ghost"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMaskEditor(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title={data.hasMask ? "编辑蒙版（已设置）" : "添加蒙版"}
                >
                  <Paintbrush className="w-3 h-3" />
                </button>
                <button
                  className="btn btn-circle btn-xs btn-ghost hover:btn-error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearImage();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="删除图片"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-ghost w-full h-[120px] border border-dashed border-base-300 hover:border-primary flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Upload className="w-6 h-6 text-base-content/40" />
            <span className="text-xs text-base-content/60">点击上传图片</span>
          </button>
        )}
      </div>

      {!isOverlay && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-image"
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        />
      )}
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

    {/* 蒙版编辑器 */}
    {showMaskEditor && (data.imageData || data.imagePath) && (
      <MaskEditorModal
        imageUrl={
          data.imagePath
            ? getImageUrl(data.imagePath)
            : `data:image/png;base64,${data.imageData}`
        }
        existingMaskData={data.maskImageData}
        existingMaskPath={data.maskImagePath}
        onSave={handleMaskSave}
        onClose={() => setShowMaskEditor(false)}
      />
    )}
  </>
  );
});

ImageInputNode.displayName = "ImageInputNode";
