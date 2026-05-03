import { memo, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { FileUp, Upload, X, FileText, FileImage, FileAudio, FileVideo, File } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import type { FileUploadNodeData } from "@/types";

// 定义节点类型
type FileUploadNode = Node<FileUploadNodeData>;

// 支持的文件类型
const SUPPORTED_MIME_TYPES = [
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  // PDF
  "application/pdf",
  // 音频
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  // 视频
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
];

// 获取文件类型图标
const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf") return FileText;
  return File;
};

// 格式化文件大小
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// 获取文件类型显示名称
const getFileTypeName = (mimeType?: string) => {
  if (!mimeType) return "未知";
  if (mimeType.startsWith("image/")) return "图片";
  if (mimeType.startsWith("audio/")) return "音频";
  if (mimeType.startsWith("video/")) return "视频";
  if (mimeType === "application/pdf") return "PDF";
  return mimeType.split("/")[1]?.toUpperCase() || "文件";
};

// 文件上传节点
export const FileUploadNode = memo(({ id, data, selected }: NodeProps<FileUploadNode>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOverlay = data.__renderOverlay === true;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 检查文件类型
      if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        alert(`不支持的文件类型: ${file.type}\n支持的类型: 图片、PDF、音频、视频`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        updateNodeData<FileUploadNodeData>(id, {
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleClearFile = useCallback(() => {
    updateNodeData<FileUploadNodeData>(id, {
      fileData: undefined,
      fileName: undefined,
      mimeType: undefined,
      fileSize: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [id, updateNodeData]);

  const FileIcon = getFileIcon(data.mimeType);

  return (
    <div
      className={`
        nc-node-card nc-node-accent-orange w-[220px] transition-all
        ${selected ? "nc-node-card-selected" : ""}
      `}
    >
      {/* 节点头部 */}
      <div className="nc-node-header nc-node-header-accent justify-start gap-2">
        <span className="nc-node-header-icon">
          <FileUp className="w-4 h-4" />
        </span>
        <span className="text-sm font-semibold truncate">{data.label}</span>
      </div>

      {/* 节点内容 */}
      <div className="p-2 nodrag">
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={handleFileSelect}
        />

        {data.fileData ? (
          <div className="relative">
            {/* 文件信息展示 */}
            <div className="nc-soft-surface rounded-lg p-3 min-h-[100px] flex flex-col items-center justify-center gap-2">
              <FileIcon className="w-10 h-10 text-base-content/60" />
              <div className="text-center w-full">
                <p className="text-xs font-medium text-base-content truncate max-w-full px-2" title={data.fileName}>
                  {data.fileName}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    {getFileTypeName(data.mimeType)}
                  </span>
                  <span className="text-[10px] text-base-content/60">
                    {formatFileSize(data.fileSize)}
                  </span>
                </div>
              </div>
            </div>
            {/* 清除按钮 */}
            <button
              className="btn btn-circle btn-xs btn-error absolute top-1 right-1 opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost w-full h-[100px] border border-dashed border-base-300 hover:border-primary flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Upload className="w-6 h-6 text-base-content/40" />
            <span className="text-xs text-base-content/60">点击上传文件</span>
            <span className="text-[10px] text-base-content/40">支持图片/PDF/音频/视频</span>
          </button>
        )}
      </div>

      {!isOverlay && (
        <Handle
          type="source"
          position={Position.Right}
          id="output-file"
          className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
        />
      )}
    </div>
  );
});

FileUploadNode.displayName = "FileUploadNode";
