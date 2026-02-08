import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { CustomNode, CustomEdge, ImageGeneratorNodeData, ImageInputNodeData } from "@/types";
import { tauriStorage } from "@/utils/tauriStorage";

// 画布数据结构
export interface CanvasData {
  id: string;
  name: string;
  nodes: CustomNode[];
  edges: CustomEdge[];
  createdAt: number;
  updatedAt: number;
}

// 侧边栏视图类型
export type SidebarView = "canvases" | "nodes" | "prompts";

interface CanvasStore {
  // 画布列表
  canvases: CanvasData[];
  // 当前激活的画布 ID
  activeCanvasId: string | null;
  // 侧边栏当前视图
  sidebarView: SidebarView;
  // 标记是否已完成数据恢复（hydration）
  _hasHydrated: boolean;

  // 画布操作
  createCanvas: (name?: string) => string;
  deleteCanvas: (id: string) => void;
  renameCanvas: (id: string, name: string) => void;
  switchCanvas: (id: string) => void;
  duplicateCanvas: (id: string) => string;

  // 更新当前画布的节点和边
  updateCanvasData: (nodes: CustomNode[], edges: CustomEdge[]) => void;

  // 获取当前画布
  getActiveCanvas: () => CanvasData | null;

  // 侧边栏视图切换
  setSidebarView: (view: SidebarView) => void;
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      canvases: [],
      activeCanvasId: null,
      sidebarView: "canvases",
      // 标记是否已完成数据恢复（hydration）
      _hasHydrated: false,

      createCanvas: (name) => {
        const id = uuidv4();
        const now = Date.now();
        const canvasCount = get().canvases.length;
        const newCanvas: CanvasData = {
          id,
          name: name || `画布 ${canvasCount + 1}`,
          nodes: [],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          canvases: [...state.canvases, newCanvas],
          activeCanvasId: id,
        }));

        return id;
      },

      deleteCanvas: (id) => {
        const { canvases, activeCanvasId } = get();
        const filtered = canvases.filter((c) => c.id !== id);

        // 如果删除的是当前画布，切换到另一个画布
        let newActiveId = activeCanvasId;
        if (activeCanvasId === id) {
          newActiveId = filtered.length > 0 ? filtered[0].id : null;
        }

        set({
          canvases: filtered,
          activeCanvasId: newActiveId,
        });
      },

      renameCanvas: (id, name) => {
        set((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === id ? { ...c, name, updatedAt: Date.now() } : c
          ),
        }));
      },

      switchCanvas: (id) => {
        set({ activeCanvasId: id });
      },

      duplicateCanvas: (id) => {
        const canvas = get().canvases.find((c) => c.id === id);
        if (!canvas) return "";

        const newId = uuidv4();
        const now = Date.now();
        const newCanvas: CanvasData = {
          ...canvas,
          id: newId,
          name: `${canvas.name} (副本)`,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          canvases: [...state.canvases, newCanvas],
          activeCanvasId: newId,
        }));

        return newId;
      },

      updateCanvasData: (nodes, edges) => {
        const { activeCanvasId } = get();
        if (!activeCanvasId) return;

        set((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === activeCanvasId
              ? { ...c, nodes, edges, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      getActiveCanvas: () => {
        const { canvases, activeCanvasId } = get();
        return canvases.find((c) => c.id === activeCanvasId) || null;
      },

      setSidebarView: (view) => {
        set({ sidebarView: view });
      },
    }),
    {
      name: "next-creator-canvases",
      storage: createJSONStorage(() => tauriStorage),
      // 数据恢复完成后的回调
      onRehydrateStorage: () => (_state, error) => {
        // 无论成功还是失败，都标记 hydration 完成
        // 这样应用可以继续正常工作
        if (error) {
          console.error("Canvas store hydration failed:", error);
        }
        useCanvasStore.setState({ _hasHydrated: true });
      },
      partialize: (state) => {
        // 清除有文件路径的节点的 base64 数据以减少存储大小
        const canvasesForStorage = state.canvases.map((canvas) => ({
          ...canvas,
          nodes: canvas.nodes.map((node) => {
            // 图片生成节点：有文件路径时清理 base64
            if (
              (node.type === "imageGeneratorProNode" ||
                node.type === "imageGeneratorFastNode") &&
              (node.data as ImageGeneratorNodeData).outputImagePath
            ) {
              return {
                ...node,
                data: {
                  ...node.data,
                  outputImage: undefined,
                },
              };
            }

            // 图片输入节点：有文件路径时同樣只持久化路徑
            if (
              node.type === "imageInputNode" &&
              (node.data as ImageInputNodeData).imagePath
            ) {
              return {
                ...node,
                data: {
                  ...node.data,
                  imageData: undefined,
                },
              };
            }

            return node;
          }),
        }));

        return {
          canvases: canvasesForStorage,
          activeCanvasId: state.activeCanvasId,
        };
      },
    }
  )
);
