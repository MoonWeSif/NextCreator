/**
 * Tauri Store 存储适配器
 * 用于 Zustand persist 中间件，使用 tauri-plugin-store
 */

// Store 实例缓存
let storeInstance: Awaited<ReturnType<typeof import("@tauri-apps/plugin-store").load>> | null = null;
// Store 初始化 Promise，避免重复初始化
let storeInitPromise: Promise<Awaited<ReturnType<typeof import("@tauri-apps/plugin-store").load>> | null> | null = null;

// 获取或创建 Store 实例
async function getStore() {
  // 如果正在初始化中，等待完成
  if (storeInitPromise) {
    return storeInitPromise;
  }

  // 如果已经初始化完成，直接返回
  if (storeInstance) {
    return storeInstance;
  }

  // 开始初始化
  storeInitPromise = (async () => {
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      storeInstance = await load("app-data.json", { autoSave: false, defaults: {} });
      return storeInstance;
    } catch (error) {
      console.error("Failed to initialize Tauri store:", error);
      storeInitPromise = null;
      return null;
    }
  })();

  return storeInitPromise;
}

// 获取数据
async function getItem(key: string): Promise<string | null> {
  try {
    const store = await getStore();
    if (store) {
      const value = await store.get<string>(key);
      return value ?? null;
    }
    return null;
  } catch (error) {
    console.error("Storage getItem error:", error);
    return null;
  }
}

// 设置数据
async function setItem(key: string, value: string): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      await store.set(key, value);
      await store.save();
    }
  } catch (error) {
    console.error("Storage setItem error:", error);
  }
}

// 删除数据
async function removeItem(key: string): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      await store.delete(key);
      await store.save();
    }
  } catch (error) {
    console.error("Storage removeItem error:", error);
  }
}

// 导出符合 Zustand StateStorage 接口的对象
export const tauriStorage = {
  getItem,
  setItem,
  removeItem,
};
