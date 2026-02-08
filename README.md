<div align="center">
  <img src="docs/images/logo.png" alt="NextCreator Logo" width="120" />
  <h1>NextCreator</h1>
  <p>基于可视化节点的 AI 内容生成工作流工具</p>

  ![Version](https://img.shields.io/badge/version-0.2.3-blue.svg)
  ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)
  ![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB.svg?logo=tauri&logoColor=white)
  ![License](https://img.shields.io/badge/license-AGPL%20v3-blue.svg)
</div>

---

## 功能特性

- **节点编辑器** - 拖拽式工作流设计，支持撤销/重做、复制粘贴、自动布局
- **多画布管理** - 创建多个独立画布，数据自动持久化
- **AI 图片生成** - 支持 NanoBanana Z-Image Dall-e GPT-Image 豆包Image Flux文生图、图生图
- **AI 视频生成** - 基于 Sora Veo Kling 模型的视频生成
- **LLM 文本生成** - 支持多模态输入（文本/图片/PDF）
- **PPT 工作流** - 自动生成大纲、PPT页面，导出可编辑文字的 PPTX
- **Prompt 提示词库** - 内置大量绘图提示词，可拖拽至画布，快速使用，可添加自定义提示词，收藏你喜欢的提示词
- **工作流编排** - 支持工作流批量并行启动

## 截图预览

### 主界面
![主界面](docs/images/main-interface.png)

### PPT 工作流
![PPT 工作流](docs/images/ppt-workflow.png)

### PPT 页面生成
![PPT 页面生成](docs/images/ppt-pages.png)

### PPT 预览导出

**纯图片模式** - 直接导出 PPT 图片
![PPT 预览 - 纯图片模式](docs/images/ppt-preview-original.png)

**可编辑模式** - 去除文字仅保留背景，方便后期编辑
![PPT 预览 - 可编辑模式](docs/images/ppt-preview.png)

### Prompt 库

**Pormpt 提示词库** - 内置几十种提示词，可以拖拽至画布，快速开始使用
![Prompt 库](docs/images/prompt.png)

## 快速开始

前往 [Releases](https://github.com/MoonWeSif/NextCreator/releases) 下载最新版本：

- **macOS (Apple Silicon)**: `NextCreator_*_aarch64.dmg`
- **macOS (Intel)**: `NextCreator_*_x64.dmg`
- **Windows**: `NextCreator_*_x64-setup.exe`

### macOS 安装提示

由于应用未经 Apple 签名，首次打开可能会提示"无法验证开发者"。请在终端执行以下命令解决：

```bash
xattr -rc "/Applications/NextCreator.app"
```

## 使用流程

1. **配置供应商** - 点击右上角「供应商管理」，添加 API 供应商（如 OpenAI、Google Gemini 等）
2. **分配供应商** - 在供应商管理中为不同节点类型（图片生成、视频生成、LLM 等）指定默认供应商
3. **创建工作流** - 从左侧节点面板拖拽节点到画布，连接节点构建工作流
4. **运行生成** - 填写输入内容，点击节点的生成按钮即可

## 本地开发

```bash
# 安装依赖
bun install

# 开发模式
bun run tauri dev

# 构建应用
bun run tauri build
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS + daisyUI |
| 后端 | Tauri 2 (Rust) |
| 状态 | Zustand + IndexedDB |
| 节点 | @xyflow/react |

## 致谢

- [awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro) & [banana-prompt-quicker](https://github.com/glidea/banana-prompt-quicker) - 本项目的内置提示词参照两个仓库,感谢项目作者的整理与各个提示词的贡献者。

## 许可证

本项目基于 [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.html) 发行，详细条款请参阅仓库根目录的 `LICENSE` 文件。
