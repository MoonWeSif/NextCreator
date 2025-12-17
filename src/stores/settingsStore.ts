import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppSettings, SettingsState, Provider, NodeProviderMapping, ProviderProtocol } from "@/types";
import { tauriStorage } from "@/utils/tauriStorage";

// 默认设置
const defaultSettings: AppSettings = {
  providers: [],
  nodeProviders: {},
  theme: "light",
};

// 数据迁移：为旧版供应商数据添加 protocol 字段并处理 baseUrl
function migrateProviders(providers: Provider[]): Provider[] {
  return providers.map((provider) => {
    // 如果已经有 protocol 字段，无需迁移
    if (provider.protocol) {
      return provider;
    }

    // 检测并处理 baseUrl 中的版本路径后缀
    let baseUrl = provider.baseUrl || "";
    let protocol: ProviderProtocol = "google";  // 默认使用 Google 协议

    // 仅移除标准版本路径后缀（/v1beta, /v1），保留其他特殊路径
    if (baseUrl.match(/\/v1(beta)?$/)) {
      baseUrl = baseUrl.replace(/\/v1(beta)?$/, "");
    }

    // 移除末尾斜杠
    baseUrl = baseUrl.replace(/\/+$/, "");

    return {
      ...provider,
      baseUrl,
      protocol,
    };
  });
}

interface SettingsStore extends SettingsState {
  // 基础设置
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;

  // 供应商 CRUD
  addProvider: (provider: Omit<Provider, "id">) => string;
  updateProvider: (id: string, updates: Partial<Omit<Provider, "id">>) => void;
  removeProvider: (id: string) => void;
  getProviderById: (id: string) => Provider | undefined;

  // 节点供应商映射
  setNodeProvider: (nodeType: keyof NodeProviderMapping, providerId: string | undefined) => void;
  getNodeProvider: (nodeType: keyof NodeProviderMapping) => Provider | undefined;

  // 供应商面板状态
  isProviderPanelOpen: boolean;
  openProviderPanel: () => void;
  closeProviderPanel: () => void;
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isSettingsOpen: false,
      isProviderPanelOpen: false,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () =>
        set({ settings: defaultSettings }),

      openSettings: () =>
        set({ isSettingsOpen: true }),

      closeSettings: () =>
        set({ isSettingsOpen: false }),

      // 供应商 CRUD
      addProvider: (provider) => {
        const id = generateId();
        set((state) => ({
          settings: {
            ...state.settings,
            providers: [...state.settings.providers, { ...provider, id }],
          },
        }));
        return id;
      },

      updateProvider: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            providers: state.settings.providers.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          },
        })),

      removeProvider: (id) =>
        set((state) => {
          // 移除供应商时，同时清除相关的节点映射
          const newNodeProviders = { ...state.settings.nodeProviders };
          for (const key of Object.keys(newNodeProviders) as (keyof NodeProviderMapping)[]) {
            if (newNodeProviders[key] === id) {
              delete newNodeProviders[key];
            }
          }

          return {
            settings: {
              ...state.settings,
              providers: state.settings.providers.filter((p) => p.id !== id),
              nodeProviders: newNodeProviders,
            },
          };
        }),

      getProviderById: (id) => {
        return get().settings.providers.find((p) => p.id === id);
      },

      // 节点供应商映射
      setNodeProvider: (nodeType, providerId) =>
        set((state) => ({
          settings: {
            ...state.settings,
            nodeProviders: {
              ...state.settings.nodeProviders,
              [nodeType]: providerId,
            },
          },
        })),

      getNodeProvider: (nodeType) => {
        const state = get();
        const providerId = state.settings.nodeProviders[nodeType];
        if (!providerId) return undefined;
        return state.settings.providers.find((p) => p.id === providerId);
      },

      // 供应商面板状态
      openProviderPanel: () =>
        set({ isProviderPanelOpen: true }),

      closeProviderPanel: () =>
        set({ isProviderPanelOpen: false }),
    }),
    {
      name: "next-creator-settings",
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({ settings: state.settings }),
      // 数据迁移：在 store 恢复时执行
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("[settingsStore] 数据恢复失败:", error);
            return;
          }
          if (state && state.settings.providers.length > 0) {
            // 执行供应商数据迁移
            const migratedProviders = migrateProviders(state.settings.providers);
            // 检查是否有变化（需要迁移）
            const needsMigration = migratedProviders.some((p, i) => {
              const original = state.settings.providers[i];
              return p.protocol !== original.protocol || p.baseUrl !== original.baseUrl;
            });
            if (needsMigration) {
              console.log("[settingsStore] 执行供应商数据迁移");
              state.updateSettings({ providers: migratedProviders });
            }
          }
        };
      },
    }
  )
);
