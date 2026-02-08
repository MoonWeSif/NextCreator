// 页面补充信息
export interface PageSupplement {
  text?: string;               // 额外文字描述
  imageRefs?: string[];        // 引用的图片标识（节点 ID）
}

// PPT 大纲结构（LLM 输出格式）
export interface PPTOutline {
  title: string;
  pages: Array<{
    pageNumber: number;
    heading: string;           // 页面标题（如 "系统模型与优化目标"）
    points: string[];          // PPT 要点（项目符号列表）
    imageDesc?: string;        // 推荐配图描述（可选，仅供参考）
    script: string;            // 口头讲稿
    supplement?: PageSupplement; // 额外补充信息（用户微调，非 LLM 生成）
  }>;
}

// PPT 大纲的 JSON Schema（用于 Gemini 结构化输出）
export const PPT_OUTLINE_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "PPT 的主标题",
    },
    pages: {
      type: "array",
      description: "PPT 页面列表",
      items: {
        type: "object",
        properties: {
          pageNumber: {
            type: "integer",
            description: "页码，从 1 开始",
          },
          heading: {
            type: "string",
            description: "页面标题，如「系统模型与优化目标」",
          },
          points: {
            type: "array",
            description: "PPT 要点列表，使用项目符号形式",
            items: {
              type: "string",
            },
          },
          imageDesc: {
            type: "string",
            description: "推荐配图描述（可选，仅供参考）",
          },
          script: {
            type: "string",
            description: "口头讲稿，使用第一人称",
          },
        },
        required: ["pageNumber", "heading", "points", "script"],
      },
    },
  },
  required: ["title", "pages"],
};

// 连接的图片信息（用于多图输入场景）
export interface ConnectedImageInfo {
  id: string;                  // 图片唯一标识（节点 ID）
  fileName?: string;           // 文件名（用于显示）
  imageData: string;           // base64 数据（可能为空，需要从 imagePath 加载）
  imagePath?: string;          // 图片文件路径（Tauri 环境下使用）
}

// PPT 单页项目状态
export type PPTPageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

// PPT 单页数据
export interface PPTPageItem {
  id: string;
  pageNumber: number;
  heading: string;
  points: string[];            // PPT 要点
  imageDesc?: string;          // 推荐配图描述
  script: string;              // 口头讲稿
  supplement?: PageSupplement; // 额外补充信息（用户微调）
  status: PPTPageStatus;
  result?: {
    image: string;             // base64 - 完整的 PPT 页面图片（用于导出）
    imagePath?: string;        // 文件路径 - Tauri 环境下的本地存储路径
    thumbnail?: string;        // 缩略图 base64（用于画布预览，JPEG 格式）
    thumbnailPath?: string;    // 缩略图文件路径（Tauri 环境）
    generatedAt: number;
    attempts: number;
  };
  manualImage?: string;        // 用户手动上传的替换图片（base64）
  manualImagePath?: string;    // 用户手动上传图片的文件路径（Tauri 环境）
  manualThumbnail?: string;    // 手动上传图片的缩略图（用于画布预览）
  manualThumbnailPath?: string; // 手动上传缩略图的文件路径
  error?: string;
}

// 大纲配置 - 页数范围
export type PageCountRange = "5-8" | "8-12" | "12-15" | "custom";

// 大纲配置 - 详细程度
export type DetailLevel = "concise" | "moderate" | "detailed";

// 大纲生成模型 - 预设选项
export const OUTLINE_PRESET_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
];

// 默认大纲模型
export const DEFAULT_OUTLINE_MODEL = "gemini-3-pro-preview";

// 页面图片生成模型 - 预设选项
export const IMAGE_PRESET_MODELS = [
  { value: "gemini-2.5-flash-image", label: "NanoBanana" },
  { value: "gemini-3-pro-image-preview", label: "NanoBanana Pro(推荐)" },
];

// 默认图片生成模型
export const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";

// 视觉风格模板类型（增加 custom 自定义选项）
export type VisualStyleTemplate = "academic" | "business" | "tech" | "custom";

// PPT 内容节点数据
export interface PPTContentNodeData {
  [key: string]: unknown;
  label: string;

  // === 当前标签页 ===
  activeTab: "config" | "outline" | "pages";

  // === 配置标签页：大纲生成配置 ===
  outlineConfig: {
    pageCountRange: PageCountRange;
    customPageCount?: number;        // 自定义页数
    detailLevel: DetailLevel;
    additionalNotes: string;         // 自由补充框
  };
  // 大纲生成使用的模型
  outlineModel: string;
  // 页面图片生成使用的模型
  imageModel: string;

  // === 大纲标签页 ===
  outlineStatus: "idle" | "generating" | "ready" | "error";
  outline?: PPTOutline;
  outlineError?: string;

  // === 页面标签页：图片生成配置 ===
  imageConfig: {
    aspectRatio: "16:9" | "4:3";
    imageSize: "1K" | "2K" | "4K";
  };
  // 视觉风格模板选择
  visualStyleTemplate: VisualStyleTemplate;
  // 自定义视觉风格提示词（当 visualStyleTemplate 为 "custom" 时使用）
  customVisualStylePrompt?: string;
  // 选中的基底图 ID（多图时使用）
  selectedTemplateId?: string;
  // 第一页是否为标题页（默认 true）
  firstPageIsTitlePage: boolean;
  pages: PPTPageItem[];
  generationStatus: "idle" | "running" | "paused" | "completed" | "error";
  progress: { completed: number; total: number };
}

// 构建系统提示词 - 根据配置参数动态生成
export function buildSystemPrompt(config: PPTContentNodeData["outlineConfig"]): string {
  // 页数范围描述
  const pageCountText = config.pageCountRange === "custom"
    ? `${config.customPageCount || 8} 页左右`
    : config.pageCountRange.replace("-", " 到 ") + " 页";

  // 详细程度描述
  const detailText = {
    concise: "简洁明了，每个要点保持精炼（2-3个要点/页），讲稿简短（50-100字）",
    moderate: "适中详细，要点完整（3-5个要点/页），讲稿适中（100-200字）",
    detailed: "详细展开，要点丰富（4-6个要点/页），讲稿详细（200-300字）",
  }[config.detailLevel];

  // 额外说明
  const additionalText = config.additionalNotes?.trim()
    ? `\n\n用户额外要求：\n${config.additionalNotes}`
    : "";

  return `你是一个专业的学术/技术 PPT 大纲生成助手。根据用户提供的主题、论文摘要或内容大纲，生成结构化的 PPT 大纲。

**生成要求：**
- 总页数：${pageCountText}
- 详细程度：${detailText}${additionalText}

**输出格式要求：**
1. 严格按照 JSON 格式输出
2. 每页包含：
   - pageNumber: 页码
   - heading: 页面标题（简洁有力，如"系统模型与优化目标"、"实验结果分析"）
   - points: PPT 要点数组（使用项目符号列表形式，支持 Markdown 格式如加粗、公式等）
   - imageDesc: 推荐配图描述（可选，仅作为参考建议，如"可以用一个简单的系统架构图"或"不一定需要图，可以用对比表"）
   - script: 口头讲稿（用第一人称，如"大家好，我今天要汇报的是..."）
3. 页面结构：
   - 第一页为标题页：包含标题、副标题、作者/出处、汇报人/日期，**标题页不需要 imageDesc 字段**
   - 中间页面：逻辑清晰、层层递进，涵盖背景动机、方法介绍、实验结果等
   - 最后一页为总结/启发/局限性

JSON 格式示例：
{
  "title": "论文标题或 PPT 主标题",
  "pages": [
    {
      "pageNumber": 1,
      "heading": "标题页",
      "points": [
        "**标题：** Semantic Information Extraction...",
        "**副标题：** GPT 支持的多智能体语义通信",
        "**作者：** Li Zhou et al., IEEE TCCN, 2025",
        "**汇报人：** 姓名 / 日期"
      ],
      "script": "大家好，我今天要汇报的是一篇发表在 IEEE TCCN 上的工作..."
    },
    {
      "pageNumber": 2,
      "heading": "研究背景与动机",
      "points": [
        "**现状：** 传统多智能体通信带宽占用大",
        "**痛点：** 缺乏语义层面的信息筛选",
        "**机会：** LLM 可以提取关键语义信息"
      ],
      "imageDesc": "可以画一个传统通信 vs 语义通信的对比示意图",
      "script": "首先来看研究背景。在多智能体系统中，传统的通信方式..."
    }
  ]
}`
}

// 视觉风格模板定义
export const VISUAL_STYLE_TEMPLATES: Record<VisualStyleTemplate, { name: string; prompt: string }> = {
  academic: {
    name: "学术风格",
    prompt: `帮我直接输出适用于 PPT 的图片，使用中文进行 PPT 内容的制作，以我上传的图片为基底模板。

**【最重要】模板结构保持要求 (CRITICAL - Template Structure Preservation)：**
你必须严格保持基底图的整体版式结构不变，这是最高优先级的要求：
1. **顶部标题区域**：必须与基底图完全一致，包括：
   - 标题栏的背景颜色、形状、位置
   - 左侧图标的样式和位置（如果有）
   - 分隔线的样式和颜色
   - 只替换标题文字内容，其他元素保持不变
2. **底部区域**：必须与基底图完全一致，包括：
   - 底部装饰条/页脚的颜色、形状、位置
   - 底部任何装饰元素的样式
3. **中间内容区域**：这是唯一可以自由设计的区域，根据内容需求布局
4. **整体配色**：必须沿用基底图的配色方案，不要引入新的主色调

视觉风格与设计要求 (Visual Style & Design Specs)：

**整体风格：**
现代、专业的技术型图表 (Technical Infographic)。设计应整洁、扁平化 (Flat Design) 但富有层次感，类似于系统架构图或高级流程图。

**配色方案：**
采用基底图的配色方案。通常以蓝色、白色、灰色为主色调，使用强调色突出关键标题、痛点或重要路径。

**中间内容区布局：**
- **强调区域：** 对于内容中的"技术难点"、"核心问题"或"主要目标"，请使用带有醒目背景色的横幅或文本框进行突出展示。
- **主体结构：** 将核心内容组织成模块化的结构。使用矩形或圆角矩形框来代表不同的功能、步骤或组件。
- **流程与连接：** 使用清晰、粗壮的箭头和线条来表示逻辑流、数据流、控制流或先后顺序。确保连接关系一目了然。

**元素细节：**
- 在每个模块框内，除了标题和简短文字外，请搭配一个简洁、相关的图标 (Icon)以增强可视化效果。
- 如果内容适合，可以采用分层结构来展示体系架构。
- 确保所有文字清晰可读，图表整体平衡、专业，可以直接插入 PPT 使用。

**重要说明：**
- 顶部标题直接使用页面标题文字替换基底图中的标题文字，保持原有的标题样式和位置
- 推荐配图仅作为参考，如果有合适的配图需求就融入设计，不是必须要有配图元素`,
  },
  business: {
    name: "商务风格",
    prompt: `帮我直接输出适用于 PPT 的图片，使用中文进行 PPT 内容的制作，以我上传的图片为基底模板。

**【最重要】模板结构保持要求 (CRITICAL - Template Structure Preservation)：**
你必须严格保持基底图的整体版式结构不变，这是最高优先级的要求：
1. **顶部标题区域**：必须与基底图完全一致，包括：
   - 标题栏的背景颜色、形状、位置
   - 左侧图标的样式和位置（如果有）
   - 分隔线的样式和颜色
   - 只替换标题文字内容，其他元素保持不变
2. **底部区域**：必须与基底图完全一致，包括：
   - 底部装饰条/页脚的颜色、形状、位置
   - 底部任何装饰元素的样式
3. **中间内容区域**：这是唯一可以自由设计的区域，根据内容需求布局
4. **整体配色**：必须沿用基底图的配色方案，不要引入新的主色调

视觉风格与设计要求 (Visual Style & Design Specs)：

**整体风格：**
简洁大气的商务演示风格 (Corporate Presentation)。设计应现代、高端，注重信息的清晰传达和视觉冲击力。

**配色方案：**
采用基底图的配色方案，保持商务感。通常以深蓝色、藏青色或深灰色为主色调，使用强调色突出关键数据和重点。

**中间内容区布局：**
- **主体结构：** 采用卡片式布局或大色块分区，信息层次分明。适合展示数据对比、时间线、流程图。
- **数据展示：** 善用图表（柱状图、饼图、折线图），数据可视化要清晰易读。
- **留白处理：** 保持适当的留白，避免信息过载，让重点更突出。

**元素细节：**
- 使用简约的线性图标配合文字内容
- 重要数字使用大字号突出显示
- 可使用渐变色块或阴影增加质感
- 保持整体视觉的统一性和专业感

**重要说明：**
- 顶部标题直接使用页面标题文字替换基底图中的标题文字，保持原有的标题样式和位置
- 推荐配图仅作为参考，如果有合适的配图需求就融入设计，不是必须要有配图元素`,
  },
  tech: {
    name: "科技风格",
    prompt: `帮我直接输出适用于 PPT 的图片，使用中文进行 PPT 内容的制作，以我上传的图片为基底模板。

**【最重要】模板结构保持要求 (CRITICAL - Template Structure Preservation)：**
你必须严格保持基底图的整体版式结构不变，这是最高优先级的要求：
1. **顶部标题区域**：必须与基底图完全一致，包括：
   - 标题栏的背景颜色、形状、位置
   - 左侧图标的样式和位置（如果有）
   - 分隔线的样式和颜色
   - 只替换标题文字内容，其他元素保持不变
2. **底部区域**：必须与基底图完全一致，包括：
   - 底部装饰条/页脚的颜色、形状、位置
   - 底部任何装饰元素的样式
3. **中间内容区域**：这是唯一可以自由设计的区域，根据内容需求布局
4. **整体配色**：必须沿用基底图的配色方案，不要引入新的主色调

视觉风格与设计要求 (Visual Style & Design Specs)：

**整体风格：**
前沿科技感的演示风格 (Futuristic Tech Style)。设计应现代、动感，带有一定的科幻元素，适合展示技术创新、AI、大数据等主题。

**配色方案：**
采用基底图的配色方案。保持深色背景为主的科技感，使用基底图中的强调色营造科技感和未来感。

**中间内容区布局：**
- **背景元素：** 可适当添加科技感装饰元素（网格线、粒子点阵、光线效果等），但不要喧宾夺主
- **主体结构：** 使用卡片、面板或浮动元素组织内容，边框可使用发光线条
- **连接关系：** 使用流光线条或动态箭头表示数据流、信息流

**元素细节：**
- 使用科技感线性图标或微光效果图标
- 可使用毛玻璃效果 (glassmorphism) 或渐变透明效果
- 重要数据可使用数字仪表盘风格展示
- 整体保持高级感，避免过度装饰

**重要说明：**
- 顶部标题直接使用页面标题文字替换基底图中的标题文字，保持原有的标题样式和位置
- 推荐配图仅作为参考，如果有合适的配图需求就融入设计，不是必须要有配图元素`,
  },
  // 自定义风格 - 占位，实际使用 customVisualStylePrompt
  custom: {
    name: "自定义",
    prompt: "",
  },
};

// 获取视觉风格提示词
export function getVisualStylePrompt(template: VisualStyleTemplate, customPrompt?: string): string {
  // 自定义风格使用用户输入的提示词
  if (template === "custom") {
    return customPrompt || VISUAL_STYLE_TEMPLATES.academic.prompt; // 降级为学术风格
  }
  return VISUAL_STYLE_TEMPLATES[template].prompt;
}

// 默认视觉风格提示词（保留兼容性，指向学术风格）
export const DEFAULT_VISUAL_STYLE_PROMPT = VISUAL_STYLE_TEMPLATES.academic.prompt;

// 标题页专用提示词
export const TITLE_PAGE_PROMPT = `帮我直接输出适用于 PPT 的**标题页**图片，使用中文进行内容制作。

**【最重要】这是标题页，设计必须简洁大气：**
标题页的核心目标是突出主题、建立第一印象，不需要复杂的信息图表或详细内容。

**关于基底图的使用：**
我上传的基底图主要是为内容页设计的，标题页只需**参考其风格和配色**即可：
- 沿用基底图的主色调和配色方案
- 可以参考其装饰元素风格，但不必完全复制版式结构
- 标题页不需要顶部标题栏，整体应更简洁开阔

**设计要求：**
1. **整体风格**：简洁、大气、专业，留白充足
2. **核心元素**：
   - 主标题：使用大号字体，醒目突出，是页面的视觉中心
   - 副标题：字号适中，位于主标题下方
   - 其他信息（作者/汇报人/日期等）：使用小号字体，位于页面底部或角落
3. **布局原则**：
   - 内容垂直居中或略偏上
   - 大量留白，不要填满整个页面
   - 信息层次分明：主标题 > 副标题 > 其他信息

**【注意事项】**：
- 不要在图片中出现"标题："、"副标题："等标签前缀。
-可以出现"汇报人："、"作者："、"日期："等标签前缀
- 不要添加复杂的装饰元素
- 不要把所有内容挤在一起`;

// 构建单页图片生成的完整提示词
export function buildPageImagePrompt(
  page: PPTPageItem,
  visualStylePrompt: string,
  supplementImages?: { fileName: string }[],
  isTitlePage?: boolean
): string {
  // 如果是标题页，使用专门的标题页提示词
  if (isTitlePage) {
    const pointsText = page.points.map((p) => `- ${p}`).join('\n');

    let content = `**标题页内容：**
${pointsText}`;

    // 添加用户额外补充说明
    if (page.supplement?.text) {
      content += `

**用户额外说明：**
${page.supplement.text}`;
    }

    return `${content}

${TITLE_PAGE_PROMPT}`;
  }

  // 普通内容页的提示词逻辑
  // 格式化要点，保留原始格式
  const pointsText = page.points.map((p) => `- ${p}`).join('\n');

  // 构建输入内容部分
  let inputContent = `1. 输入内容 (Input Data): 请基于以下我提供的文字大纲/草稿来设计图表内容：

## ${page.heading}

**PPT 要点：**
${pointsText}`;

  // 如果有推荐配图描述，添加它（作为参考）
  if (page.imageDesc) {
    inputContent += `

**推荐配图（仅供参考）：**
${page.imageDesc}`;
  }

  // 添加口头讲稿
  inputContent += `

**口头讲稿：**
${page.script}`;

  // 添加用户额外补充说明
  if (page.supplement?.text) {
    inputContent += `

**用户额外补充说明：**
${page.supplement.text}`;
  }

  // 添加参考素材图片说明
  if (supplementImages && supplementImages.length > 0) {
    inputContent += `

**参考素材图片：**
${supplementImages.map(img => `- ${img.fileName}`).join('\n')}
请参考这些图片的内容和风格进行设计。`;
  }

  // 组合最终提示词
  return `${inputContent}

2. ${visualStylePrompt}`;
}
