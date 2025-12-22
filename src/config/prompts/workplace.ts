import type { PromptCategory } from "../promptConfig";

// 工作效率类提示词
export const workplaceCategory: PromptCategory = {
  id: "workplace",
  name: "工作效率",
  nameEn: "Workplace & Productivity",
  icon: "Briefcase",
  description: "将白板草图转换为专业图表和UI原型",
  prompts: [
    {
      id: "flowchart-conversion",
      title: "手绘流程图转换",
      titleEn: "Hand-drawn Flowchart to Corporate Charts",
      description: "将白板草图转换为清晰的麦肯锡风格矢量图",
      prompt: `Convert this hand-drawn whiteboard sketch into a professional corporate flowchart suitable for a business presentation. Style Guide: Use a minimalist 'McKinsey-style' aesthetic: clean lines, ample whitespace, and a sophisticated blue-and-gray color palette. Structure: Automatically align all boxes and diamonds to a strict grid. Connect them with straight, orthogonal arrows (90-degree angles only, no curvy lines). Text: Transcribe the handwritten labels into a clear, bold Sans-Serif font (like Arial or Roboto). Output: High-resolution vector-style image on a pure white background.`,
      tags: ["流程图", "商务", "麦肯锡", "图表"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/c59d3272-7525-4be0-94e3-8d642baaa659",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "ui-prototype",
      title: "UI草图转高保真原型",
      titleEn: "UI Hand-drawn Sketch to High-Fidelity Prototype",
      description: "将线框草图转换为真实的移动应用原型",
      prompt: `Transform this rough wireframe sketch into a high-fidelity UI design mockups for a mobile app. Design System: Apply a modern, clean aesthetics similar to iOS 18 or Material Design 3. Use rounded corners, soft drop shadows, and a vibrant primary color. Components: Intelligently interpret the sketch: turn scribbles into high-quality placeholder images, convert rough rectangles into proper buttons with gradients, and turn lines into realistic text blocks. Layout: Ensure perfect padding and consistent spacing between elements. Context: Place the design inside a realistic iPhone 16 frame mockups.`,
      tags: ["UI", "原型", "移动应用", "设计"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/67690896-22f8-4abc-8e89-d4779233a7ad",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "magazine-layout",
      title: "杂志排版生成",
      titleEn: "Magazine Layout Generator",
      description: "将文章可视化为带有复杂排版的印刷格式",
      prompt: `Put this whole text, verbatim, into a photo of a glossy magazine article on a desk, with photos, beautiful typography design, pull quotes and brave formatting. The text: [...the unformatted article]`,
      tags: ["杂志", "排版", "设计", "文章"],
      source: "@fofrAI",
      previewImage: "https://github.com/user-attachments/assets/5982a68e-8c7d-4c7c-a07e-2a4a0a74770d",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
