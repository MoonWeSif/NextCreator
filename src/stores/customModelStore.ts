import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { tauriStorage } from "@/utils/tauriStorage";

// 节点类型分类
export type ModelCategory =
  | "imageGenerator"
  | "videoGenerator"
  | "llmContent"
  | "pptOutline"
  | "pptImage";

interface CustomModelState {
  // 按节点类型分类存储用户自定义模型
  customModels: Record<ModelCategory, string[]>;

  // 添加自定义模型
  addCustomModel: (category: ModelCategory, model: string) => void;
  // 移除自定义模型
  removeCustomModel: (category: ModelCategory, model: string) => void;
  // 获取某分类的自定义模型列表
  getCustomModels: (category: ModelCategory) => string[];
  // 检查模型是否存在
  hasCustomModel: (category: ModelCategory, model: string) => boolean;
}

const defaultCustomModels: Record<ModelCategory, string[]> = {
  imageGenerator: [],
  videoGenerator: [],
  llmContent: [],
  pptOutline: [],
  pptImage: [],
};

export const useCustomModelStore = create<CustomModelState>()(
  persist(
    (set, get) => ({
      customModels: { ...defaultCustomModels },

      addCustomModel: (category, model) => {
        const trimmed = model.trim();
        if (!trimmed) return;

        set((state) => {
          const current = state.customModels[category] || [];
          // 避免重复添加
          if (current.includes(trimmed)) {
            return state;
          }
          return {
            customModels: {
              ...state.customModels,
              [category]: [...current, trimmed],
            },
          };
        });
      },

      removeCustomModel: (category, model) => {
        set((state) => {
          const current = state.customModels[category] || [];
          return {
            customModels: {
              ...state.customModels,
              [category]: current.filter((m) => m !== model),
            },
          };
        });
      },

      getCustomModels: (category) => {
        return get().customModels[category] || [];
      },

      hasCustomModel: (category, model) => {
        const models = get().customModels[category] || [];
        return models.includes(model);
      },
    }),
    {
      name: "custom-models",
      storage: createJSONStorage(() => tauriStorage),
    }
  )
);
