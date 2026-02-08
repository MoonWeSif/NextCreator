import { create } from "zustand";
import {
  getStorageStats,
  getStoragePath,
  clearCache,
  clearAllImages,
  deleteCanvasImages,
  listCanvasImages,
  deleteImage,
  type StorageStats,
  type ImageInfoWithMetadata,
} from "@/services/fileStorageService";

// 展开的画布 ID 集合
export type ExpandedCanvases = Set<string>;

interface StorageManagementState {
  // UI 状态
  isOpen: boolean;
  isLoading: boolean;

  // 文件存储数据
  fileStats: StorageStats | null;
  storagePath: string | null;
  expandedFileCanvases: string[];
  canvasImages: Map<string, ImageInfoWithMetadata[]>;

  // 错误信息
  error: string | null;

  // 操作
  openModal: () => void;
  closeModal: () => void;
  refreshStats: () => Promise<void>;

  // 文件存储操作
  handleClearCache: () => Promise<void>;
  handleClearAllImages: () => Promise<void>;
  handleClearCanvasImages: (canvasId: string) => Promise<void>;
  handleDeleteImage: (path: string) => Promise<void>;
  toggleFileCanvasExpanded: (canvasId: string) => Promise<void>;
  loadCanvasImages: (canvasId: string) => Promise<void>;
}

export const useStorageManagementStore = create<StorageManagementState>(
  (set, get) => ({
    isOpen: false,
    isLoading: false,

    fileStats: null,
    storagePath: null,
    expandedFileCanvases: [],
    canvasImages: new Map(),

    error: null,

    openModal: async () => {
      set({
        isOpen: true,
        isLoading: true,
        error: null,
      });

      try {
        const [fileStats, storagePath] = await Promise.all([
          getStorageStats(),
          getStoragePath(),
        ]);
        set({
          fileStats,
          storagePath,
          isLoading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "获取存储信息失败",
          isLoading: false,
        });
      }
    },

    closeModal: () => {
      set({
        isOpen: false,
        expandedFileCanvases: [],
        canvasImages: new Map(),
      });
    },

    refreshStats: async () => {
      set({ isLoading: true, error: null });

      try {
        const fileStats = await getStorageStats();
        set({ fileStats, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "刷新失败",
          isLoading: false,
        });
      }
    },

    // === 文件存储操作 ===

    handleClearCache: async () => {
      set({ isLoading: true, error: null });
      try {
        await clearCache();
        await get().refreshStats();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "清理缓存失败",
          isLoading: false,
        });
      }
    },

    handleClearAllImages: async () => {
      set({ isLoading: true, error: null });
      try {
        await clearAllImages();
        set({ canvasImages: new Map(), expandedFileCanvases: [] });
        await get().refreshStats();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "清理图片失败",
          isLoading: false,
        });
      }
    },

    handleClearCanvasImages: async (canvasId: string) => {
      set({ isLoading: true, error: null });
      try {
        await deleteCanvasImages(canvasId);
        const newCanvasImages = new Map(get().canvasImages);
        newCanvasImages.delete(canvasId);
        set({ canvasImages: newCanvasImages });
        await get().refreshStats();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "清理画布图片失败",
          isLoading: false,
        });
      }
    },

    handleDeleteImage: async (path: string) => {
      set({ isLoading: true, error: null });
      try {
        await deleteImage(path);
        const newCanvasImages = new Map(get().canvasImages);
        for (const [canvasId, images] of newCanvasImages) {
          const filtered = images.filter((img) => img.path !== path);
          if (filtered.length !== images.length) {
            newCanvasImages.set(canvasId, filtered);
          }
        }
        set({ canvasImages: newCanvasImages });
        await get().refreshStats();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "删除图片失败",
          isLoading: false,
        });
      }
    },

    toggleFileCanvasExpanded: async (canvasId: string) => {
      const { expandedFileCanvases, canvasImages } = get();
      const isExpanded = expandedFileCanvases.includes(canvasId);

      if (isExpanded) {
        // 收起
        set({
          expandedFileCanvases: expandedFileCanvases.filter((id) => id !== canvasId),
        });
      } else {
        // 展开并加载图片列表
        set({
          expandedFileCanvases: [...expandedFileCanvases, canvasId],
        });

        // 如果还没加载过，则加载
        if (!canvasImages.has(canvasId)) {
          await get().loadCanvasImages(canvasId);
        }
      }
    },

    loadCanvasImages: async (canvasId: string) => {
      try {
        const images = await listCanvasImages(canvasId);
        const newCanvasImages = new Map(get().canvasImages);
        newCanvasImages.set(canvasId, images);
        set({ canvasImages: newCanvasImages });
      } catch (err) {
        console.error("加载画布图片列表失败:", err);
      }
    },
  })
);
