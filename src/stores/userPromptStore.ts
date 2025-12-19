import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { tauriStorage } from "@/utils/tauriStorage";
import type { PromptNodeTemplate } from "@/config/promptConfig";

// 用户自定义提示词
export interface UserPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[]; // 标签
  previewImage?: string; // base64 预览图
  nodeTemplate: PromptNodeTemplate;
  createdAt: number;
  updatedAt: number;
}

// 创建新提示词的输入
export interface CreatePromptInput {
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  previewImage?: string;
  nodeTemplate: PromptNodeTemplate;
}

interface UserPromptState {
  prompts: UserPrompt[];

  // 操作方法
  addPrompt: (input: CreatePromptInput) => string;
  updatePrompt: (id: string, input: Partial<CreatePromptInput>) => void;
  deletePrompt: (id: string) => void;
  getPrompt: (id: string) => UserPrompt | undefined;
}

export const useUserPromptStore = create<UserPromptState>()(
  persist(
    (set, get) => ({
      prompts: [],

      addPrompt: (input) => {
        const id = uuidv4();
        const now = Date.now();
        const newPrompt: UserPrompt = {
          id,
          ...input,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          prompts: [newPrompt, ...state.prompts],
        }));
        return id;
      },

      updatePrompt: (id, input) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id
              ? { ...p, ...input, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }));
      },

      getPrompt: (id) => {
        return get().prompts.find((p) => p.id === id);
      },
    }),
    {
      name: "user-prompts",
      storage: createJSONStorage(() => tauriStorage),
    }
  )
);
