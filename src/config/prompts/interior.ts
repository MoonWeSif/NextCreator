import type { PromptCategory } from "../promptConfig";

// 室内设计类提示词
export const interiorCategory: PromptCategory = {
  id: "interior",
  name: "室内设计",
  nameEn: "Interior Design",
  icon: "Home",
  description: "从平面图生成完整的设计展示板",
  prompts: [
    {
      id: "floor-plan-design",
      title: "平面图转设计展示",
      titleEn: "Hard Furnishing Preview",
      description: "从简单的2D平面图生成包含透视图和3D平面图的完整设计展示板",
      prompt: `Based on the uploaded 2D floor plan, generate a professional interior design presentation board in a single image. Layout: The final image should be a collage with one large main image at the top, and several smaller images below it. Content of Each Panel:
1. Main Image (Top): A wide-angle perspective view of the main living area, showing the connection between the living room and dining area.
2. Small Image (Bottom Left): A view of the Master Bedroom, focusing on the bed and window.
3. Small Image (Bottom Middle): A view of the Home Office / Study room.
4. Small Image (Bottom Right): A 3D top-down floor plan view showing the furniture layout.
Overall Style: Apply a consistent Modern Minimalist style with warm oak wood flooring and off-white walls across ALL images. Quality: Photorealistic rendering, soft natural lighting.`,
      tags: ["室内设计", "平面图", "3D渲染", "展示板"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/cf6d0304-60b6-4262-b4a1-08571f2c491e",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "furniture-preview",
      title: "家具软装预览",
      titleEn: "Furniture Preview",
      description: "可视化房间配置家具后的效果",
      prompt: `将图2(米色沙发)合成到图1(客厅)中。
透视匹配:将沙发靠着客厅的主背景墙放置。调整其透视和比例,使其在房间现有的几何结构中看起来逼真。
光照融合:根据客厅窗户的光源计算光线,并在地板上投射出沙发逼真的阴影。调整沙发的亮度和色温,以匹配房间的环境光。
风格:保持房间的其余部分完全不变。不要改变墙壁或窗户。`,
      tags: ["家具", "软装", "预览", "室内"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/furniture_preview.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
