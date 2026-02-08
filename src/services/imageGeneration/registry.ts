/**
 * 图片生成框架 - 提供商注册表
 */

import type { ImageGenerationProvider } from "./types";
import type { ProviderProtocol } from "@/types";

/**
 * 图片生成提供商注册表
 */
class ImageGenerationProviderRegistry {
  private providers: Map<string, ImageGenerationProvider> = new Map();

  /**
   * 注册提供商
   */
  register(provider: ImageGenerationProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(
        `[ImageGenRegistry] Provider ${provider.id} already registered, overwriting`
      );
    }
    this.providers.set(provider.id, provider);
    console.log(`[ImageGenRegistry] Registered provider: ${provider.id}`);
  }

  /**
   * 获取提供商
   */
  get(id: string): ImageGenerationProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 根据协议获取提供商
   */
  getByProtocol(protocol: ProviderProtocol): ImageGenerationProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.protocol === protocol) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * 获取所有已注册的提供商
   */
  getAll(): ImageGenerationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 检查提供商是否已注册
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * 注销提供商
   */
  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * 清空所有提供商
   */
  clear(): void {
    this.providers.clear();
  }
}

// 单例导出
export const imageGenerationRegistry = new ImageGenerationProviderRegistry();
