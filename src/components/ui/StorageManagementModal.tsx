import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  HardDrive,
  Image,
  Trash2,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useStorageManagementStore } from "@/stores/storageManagementStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { formatFileSize, getImageUrl, type ImageInfoWithMetadata } from "@/services/fileStorageService";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ImageDetailModal } from "@/components/ui/ImageDetailModal";

export function StorageManagementModal() {
  const {
    isOpen,
    isLoading,
    isTauri,
    fileStats,
    storagePath,
    expandedFileCanvases,
    canvasImages,
    error,
    closeModal,
    refreshStats,
    handleClearCache,
    handleClearAllImages,
    handleClearCanvasImages,
    handleDeleteImage,
    toggleFileCanvasExpanded,
    loadCanvasImages,
  } = useStorageManagementStore();

  const { canvases } = useCanvasStore();

  // 动画状态
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "image" | "canvas" | "allImages";
    path?: string;
    filename?: string;
    canvasId?: string;
    canvasName?: string;
  } | null>(null);

  // 图片详情预览状态
  const [selectedImage, setSelectedImage] = useState<ImageInfoWithMetadata | null>(null);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState("");

  // 进入动画
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [isOpen]);

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      closeModal();
      setIsClosing(false);
    }, 200);
  }, [closeModal]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // 当用户输入搜索关键词时，自动加载所有画布的图片数据
  useEffect(() => {
    if (!searchQuery.trim() || !fileStats || !isTauri) return;

    // 加载所有未加载的画布图片
    const loadAllCanvasImages = async () => {
      const canvasIds = fileStats.images_by_canvas.map(c => c.canvas_id);
      const unloadedCanvasIds = canvasIds.filter(id => !canvasImages.has(id));

      // 并行加载所有未加载的画布图片
      await Promise.all(
        unloadedCanvasIds.map(canvasId => loadCanvasImages(canvasId))
      );
    };

    loadAllCanvasImages();
  }, [searchQuery, fileStats, isTauri, canvasImages, loadCanvasImages]);

  if (!isOpen) return null;

  // 获取画布名称
  const getCanvasName = (canvasId: string): string => {
    const canvas = canvases.find((c) => c.id === canvasId);
    return canvas?.name || `画布 ${canvasId.slice(0, 8)}...`;
  };

  // 执行确认的删除操作
  const executeDelete = async () => {
    if (!deleteConfirm) return;

    const { type, path, canvasId } = deleteConfirm;
    setDeleteConfirm(null);

    switch (type) {
      case "image":
        if (path) await handleDeleteImage(path);
        break;
      case "canvas":
        if (canvasId) await handleClearCanvasImages(canvasId);
        break;
      case "allImages":
        await handleClearAllImages();
        break;
    }
  };

  // 确认清理所有图片
  const confirmClearAllImages = () => {
    setDeleteConfirm({ type: "allImages" });
  };

  // 确认清理画布图片
  const confirmClearCanvasImages = (canvasId: string, canvasName: string) => {
    setDeleteConfirm({ type: "canvas", canvasId, canvasName });
  };

  // 确认删除单个图片
  const confirmDeleteImage = (e: React.MouseEvent, path: string, filename: string) => {
    e.stopPropagation();
    setDeleteConfirm({ type: "image", path, filename });
  };

  // 获取确认对话框的提示信息
  const getDeleteConfirmMessage = () => {
    if (!deleteConfirm) return "";
    switch (deleteConfirm.type) {
      case "image":
        return `确定要删除图片「${deleteConfirm.filename}」吗？此操作不可撤销。`;
      case "canvas":
        return `确定要删除画布「${deleteConfirm.canvasName}」的所有图片吗？此操作不可撤销。`;
      case "allImages":
        return "确定要删除所有存储的图片吗？此操作不可撤销，已保存在画布中的图片引用将失效。";
    }
  };

  // 渲染文件存储内容（桌面端）
  const renderFileStorage = () => {
    if (!fileStats) {
      return (
        <div className="flex items-center justify-center py-12 text-base-content/50">
          <p>无法获取文件存储信息</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索提示词..."
            className="input input-sm w-full bg-base-200 border-base-300 focus:border-primary focus:outline-none pr-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-base-300 text-base-content/50 hover:text-base-content transition-colors"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 总览卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-base-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-base-content/60 mb-1">
              <Image className="w-3.5 h-3.5" />
              <span className="text-xs">图片数量</span>
            </div>
            <p className="text-xl font-bold">{fileStats.image_count}</p>
          </div>
          <div className="bg-base-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-base-content/60 mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span className="text-xs">图片大小</span>
            </div>
            <p className="text-xl font-bold">{formatFileSize(fileStats.total_size)}</p>
          </div>
          <div className="bg-base-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-base-content/60 mb-1">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="text-xs">缓存大小</span>
            </div>
            <p className="text-xl font-bold">{formatFileSize(fileStats.cache_size)}</p>
          </div>
        </div>

        {/* 存储路径 */}
        {storagePath && (
          <div className="bg-base-200 rounded-lg p-3">
            <p className="text-xs text-base-content/60 mb-1">存储位置</p>
            <p className="text-sm font-mono break-all">{storagePath}</p>
          </div>
        )}

        {/* 按画布分组的存储 */}
        {fileStats.images_by_canvas.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">按画布分组</h3>
            <div className="space-y-2">
              {fileStats.images_by_canvas.map((canvasStats) => {
                const canvasName = getCanvasName(canvasStats.canvas_id);
                const isExpanded = expandedFileCanvases.includes(canvasStats.canvas_id);
                const allImages = canvasImages.get(canvasStats.canvas_id) || [];

                // 根据搜索关键词过滤图片
                const filteredImages = !searchQuery.trim()
                  ? allImages
                  : allImages.filter((image) => {
                      const query = searchQuery.toLowerCase();
                      // 搜索提示词
                      const promptMatch = image.metadata?.prompt?.toLowerCase().includes(query);
                      // 搜索文件名
                      const filenameMatch = image.filename.toLowerCase().includes(query);
                      return promptMatch || filenameMatch;
                    });

                // 如果有搜索关键词且没有匹配结果，不显示这个画布分组
                if (searchQuery.trim() && filteredImages.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={canvasStats.canvas_id}
                    className="border border-base-300 rounded-lg overflow-hidden"
                  >
                    {/* 画布头部 */}
                    <div
                      className="flex items-center justify-between bg-base-200 p-3 cursor-pointer hover:bg-base-300 transition-colors"
                      onClick={() => toggleFileCanvasExpanded(canvasStats.canvas_id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-base-content/60" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-base-content/60" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{canvasName}</p>
                          <p className="text-xs text-base-content/60">
                            {searchQuery.trim()
                              ? `${filteredImages.length} / ${canvasStats.image_count} 张图片`
                              : `${canvasStats.image_count} 张图片`
                            } · {formatFileSize(canvasStats.total_size)}
                          </p>
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmClearCanvasImages(canvasStats.canvas_id, canvasName);
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 展开的图片列表 */}
                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-base-100">
                        {allImages.length === 0 ? (
                          <div className="text-center py-4 text-base-content/50 text-sm">
                            <LoadingIndicator size="md" variant="dots" className="text-primary mx-auto mb-2" />
                            加载中...
                          </div>
                        ) : filteredImages.length === 0 ? (
                          <div className="text-center py-4 text-base-content/50 text-sm">
                            <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>没有匹配的图片</p>
                          </div>
                        ) : (
                          filteredImages.map((image) => (
                            <div
                              key={image.id}
                              className="flex items-center gap-3 p-2 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                              onClick={() => setSelectedImage(image)}
                            >
                              {/* 图片预览 */}
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-base-300 relative">
                                <img
                                  src={getImageUrl(image.path)}
                                  alt={image.filename}
                                  className="w-full h-full object-cover"
                                />
                                {/* 类型标签 */}
                                {image.image_type && (
                                  <div
                                    className={`absolute bottom-0 right-0 px-1 text-[9px] leading-tight text-white ${
                                      image.image_type === "input"
                                        ? "bg-green-500"
                                        : "bg-purple-500"
                                    }`}
                                    title={image.image_type === "input" ? "上传的图片" : "生成的图片"}
                                  >
                                    {image.image_type === "input" ? "输入" : "生成"}
                                  </div>
                                )}
                              </div>
                              {/* 图片信息 */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{image.filename}</p>
                                <p className="text-xs text-base-content/60">
                                  {formatFileSize(image.size)} ·{" "}
                                  {new Date(image.created_at * 1000).toLocaleString('zh-CN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              {/* 删除按钮 */}
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={(e) => confirmDeleteImage(e, image.path, image.filename)}
                                disabled={isLoading}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {fileStats.image_count === 0 && fileStats.cache_size === 0 && (
          <div className="text-center py-8 text-base-content/60">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无存储的图片或缓存</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-3 border-t border-base-300">
          <button
            className="btn btn-ghost btn-sm flex-1"
            onClick={refreshStats}
            disabled={isLoading}
          >
            {isLoading ? <LoadingIndicator size="sm" variant="dots" /> : <RefreshCw className="w-4 h-4" />}
            刷新
          </button>
          <button
            className="btn btn-ghost btn-sm flex-1"
            onClick={handleClearCache}
            disabled={isLoading || fileStats.cache_size === 0}
          >
            <FolderOpen className="w-4 h-4" />
            清理缓存
          </button>
          <button
            className="btn btn-error btn-sm flex-1"
            onClick={confirmClearAllImages}
            disabled={isLoading || fileStats.image_count === 0}
          >
            <Trash2 className="w-4 h-4" />
            清理所有图片
          </button>
        </div>
      </div>
    );
  };

  // 渲染浏览器环境内容
  const renderBrowserStorage = () => {
    return (
      <div className="space-y-4">
        {/* 存储位置 */}
        <div className="bg-base-200 rounded-lg p-3">
          <p className="text-xs text-base-content/60 mb-1">存储位置</p>
          <p className="text-sm font-mono">{storagePath}</p>
        </div>

        {/* 说明信息 */}
        <div className="bg-info/10 rounded-lg p-3 text-sm">
          <p className="font-medium mb-2 text-info">关于浏览器存储</p>
          <ul className="text-xs space-y-1 text-base-content/70">
            <li>• 数据存储在浏览器的 localStorage 中</li>
            <li>• 图片以 base64 格式内嵌存储</li>
            <li>• 清除浏览器数据会导致数据丢失</li>
            <li>• 建议使用桌面应用获得更好的存储管理体验</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-3 border-t border-base-300">
          <button
            className="btn btn-ghost btn-sm flex-1"
            onClick={refreshStats}
            disabled={isLoading}
          >
            {isLoading ? <LoadingIndicator size="sm" variant="dots" /> : <RefreshCw className="w-4 h-4" />}
            刷新
          </button>
        </div>
      </div>
    );
  };

  const modalContent = createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className={`
          absolute inset-0
          transition-all duration-200 ease-out
          ${isVisible && !isClosing ? "bg-black/50" : "bg-black/0"}
        `}
        onClick={handleClose}
      />

      {/* Modal 内容 */}
      <div
        className={`
          relative bg-base-100 rounded-2xl shadow-2xl w-[650px] max-h-[85vh] overflow-hidden flex flex-col
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">存储管理</h2>
              <p className="text-xs text-base-content/60">
                管理应用的图片存储
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingIndicator size="lg" variant="dots" className="text-primary" />
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="alert alert-error mb-4">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* 根据环境渲染内容 */}
          {!isLoading && isTauri && renderFileStorage()}
          {!isLoading && !isTauri && renderBrowserStorage()}
        </div>

        {/* 删除确认对话框 */}
        {deleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-base-100 rounded-xl p-5 mx-4 max-w-sm shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-error/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-error" />
                </div>
                <h3 className="font-semibold">确认删除</h3>
              </div>
              <p className="text-sm text-base-content/70 mb-5">
                {getDeleteConfirmMessage()}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeleteConfirm(null)}
                >
                  取消
                </button>
                <button
                  className="btn btn-error btn-sm"
                  onClick={executeDelete}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {modalContent}
      {/* 图片详情预览 */}
      {selectedImage && (
        <ImageDetailModal
          imageInfo={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}
