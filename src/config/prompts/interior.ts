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
  ],
};
