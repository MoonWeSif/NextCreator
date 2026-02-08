/**
 * 视频生成框架 - 提供商注册表
 */

import type { VideoGenerationProvider } from "./types";
import type { ProviderProtocol } from "@/types";

/**
 * 视频生成提供商注册表
 */
class VideoGenerationProviderRegistry {
  private providers: Map<string, VideoGenerationProvider> = new Map();

  /**
   * 注册提供商
   */
  register(provider: VideoGenerationProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(
        `[VideoGenRegistry] Provider ${provider.id} already registered, overwriting`
      );
    }
    this.providers.set(provider.id, provider);
    console.log(`[VideoGenRegistry] Registered provider: ${provider.id}`);
  }

  /**
   * 获取提供商
   */
  get(id: string): VideoGenerationProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 根据协议获取提供商
   */
  getByProtocol(protocol: ProviderProtocol): VideoGenerationProvider | undefined {
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
  getAll(): VideoGenerationProvider[] {
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
export const videoGenerationRegistry = new VideoGenerationProviderRegistry();
