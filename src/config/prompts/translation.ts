import type { PromptCategory } from "../promptConfig";

// 翻译本地化类提示词
export const translationCategory: PromptCategory = {
  id: "translation",
  name: "翻译本地化",
  nameEn: "Daily Life & Translation",
  icon: "Globe",
  description: "菜单翻译、漫画本地化,保留原始纹理",
  prompts: [
    {
      id: "menu-translation",
      title: "菜单翻译",
      titleEn: "Physical Store/Travel Translation",
      description: "翻译菜单或标志,同时保留原始表面纹理",
      prompt: `Translate the Chinese dish names on the wall menu into English for foreign tourists. Texture Preservation: Crucial! Maintain the original aged, greasy, and textured look of the wall/paper. The new English text should look like it was written/printed on the same surface, with slight fading or wear to match. Currency: Keep the '¥' symbol and price numbers exactly as they are; do not convert currency. Layout: align the English translations next to or replacing the Chinese characters naturally.`,
      tags: ["翻译", "菜单", "旅行", "本地化"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/46c82371-4f9d-431c-9a11-65f51862a792",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "comic-localization",
      title: "漫画/表情包本地化",
      titleEn: "Digital Content Localization",
      description: "通过清除文字气泡并替换为匹配字体的内容来翻译漫画或表情包",
      prompt: `Translate the text in the speech bubbles/captions from [Japanese/English] to [Chinese]. Seamless Cleaning: Erase the original text and perfectly fill the background (e.g., the white speech bubble or the colored image background). Style Matching: Render the translated Chinese text using a casual, handwritten-style font (or bold impact font for memes) that matches the aesthetic of the original image. Fit: Ensure the text fits naturally within the bubbles without overcrowding.`,
      tags: ["翻译", "漫画", "表情包", "本地化"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/2cb58cf3-c05f-45d0-9f04-67fd7ba00267",
      nodeTemplate: { requiresImageInput: true, generatorType: "fast", aspectRatio: "1:1" },
    },
  ],
};
