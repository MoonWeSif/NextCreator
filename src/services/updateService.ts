/**
 * GitHub 更新检测服务
 * 通过 GitHub API 获取最新 tag 来检测更新
 */

// 从 package.json 动态获取版本号需要在编译时注入，这里使用常量
// 在 vite.config.ts 中会通过 define 注入
declare const __APP_VERSION__: string;

// GitHub 仓库信息
export const GITHUB_REPO = {
  owner: "MoonWeSif",
  repo: "NextCreator",
  url: "https://github.com/MoonWeSif/NextCreator",
};

// 项目信息
export const PROJECT_INFO = {
  name: "NextCreator",
  description: "基于可视化节点的 AI 内容生成工作流工具",
  author: "MoonWeSif",
  license: "AGPL-3.0",
};

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body?: string;
  published_at?: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * 获取当前应用版本号
 */
export function getCurrentVersion(): string {
  // 使用 Vite 注入的版本号，如果不存在则使用默认值
  return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.2.3";
}

/**
 * 比较版本号
 * @returns 正数表示 v1 > v2，负数表示 v1 < v2，0 表示相等
 */
function compareVersions(v1: string, v2: string): number {
  // 移除版本号前的 v 前缀
  const normalize = (v: string) => v.replace(/^v/, "");
  const parts1 = normalize(v1).split(".").map(Number);
  const parts2 = normalize(v2).split(".").map(Number);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) {
      return p1 - p2;
    }
  }

  return 0;
}

/**
 * 从 GitHub API 获取最新的 release
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const url = `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/releases/latest`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.status === 404) {
      // 没有 release，尝试获取 tags
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("获取最新 release 失败:", error);
    return null;
  }
}

/**
 * 从 GitHub API 获取最新的 tag
 */
async function fetchLatestTag(): Promise<string | null> {
  const url = `https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/tags`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status}`);
    }

    const tags: { name: string }[] = await response.json();

    if (tags.length === 0) {
      return null;
    }

    // 返回第一个 tag（最新的）
    return tags[0].name;
  } catch (error) {
    console.error("获取最新 tag 失败:", error);
    return null;
  }
}

/**
 * 检测更新
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = getCurrentVersion();

  // 首先尝试获取 release 信息
  const release = await fetchLatestRelease();

  if (release && !release.draft && !release.prerelease) {
    const latestVersion = release.tag_name;
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion.replace(/^v/, ""),
      releaseUrl: release.html_url,
      releaseNotes: release.body,
      publishedAt: release.published_at,
    };
  }

  // 如果没有 release，尝试获取 tag
  const latestTag = await fetchLatestTag();

  if (latestTag) {
    const hasUpdate = compareVersions(latestTag, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestTag.replace(/^v/, ""),
      releaseUrl: `${GITHUB_REPO.url}/releases/tag/${latestTag}`,
    };
  }

  // 没有找到任何版本信息
  return {
    hasUpdate: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseUrl: `${GITHUB_REPO.url}/releases`,
  };
}
