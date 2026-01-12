import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { tauriStorage } from "@/utils/tauriStorage";

interface FavoritePromptState {
  // 收藏的提示词 ID 集合
  favoriteIds: Set<string>;

  // 操作方法
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritePromptStore = create<FavoritePromptState>()(
  persist(
    (set, get) => ({
      favoriteIds: new Set(),

      addFavorite: (id) => {
        set((state) => {
          const next = new Set(state.favoriteIds);
          next.add(id);
          return { favoriteIds: next };
        });
      },

      removeFavorite: (id) => {
        set((state) => {
          const next = new Set(state.favoriteIds);
          next.delete(id);
          return { favoriteIds: next };
        });
      },

      toggleFavorite: (id) => {
        const { favoriteIds } = get();
        if (favoriteIds.has(id)) {
          get().removeFavorite(id);
        } else {
          get().addFavorite(id);
        }
      },

      isFavorite: (id) => {
        return get().favoriteIds.has(id);
      },
    }),
    {
      name: "favorite-prompts",
      storage: createJSONStorage(() => tauriStorage),
      // Set 需要序列化/反序列化处理
      partialize: (state) => ({
        favoriteIds: Array.from(state.favoriteIds),
      }),
      merge: (persisted, current) => ({
        ...current,
        favoriteIds: new Set((persisted as { favoriteIds: string[] })?.favoriteIds || []),
      }),
    }
  )
);
