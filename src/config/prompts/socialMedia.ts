import type { PromptCategory } from "../promptConfig";

// 社交媒体类提示词
export const socialMediaCategory: PromptCategory = {
  id: "social-media",
  name: "社交媒体",
  nameEn: "Social Media & Marketing",
  icon: "Megaphone",
  description: "病毒式封面图、缩略图和营销海报",
  prompts: [
    {
      id: "viral-thumbnail",
      title: "病毒式视频封面",
      titleEn: "Viral Cover Image",
      description: "创建带有文字叠加、夸张表情和明亮图形的吸引人封面",
      prompt: `Design a viral video thumbnail using the person from Image 1. Face Consistency: Keep the person's facial features exactly the same as Image 1, but change their expression to look excited and surprised. Action: Pose the person on the left side, pointing their finger towards the right side of the frame. Subject: On the right side, place a high-quality image of [a delicious avocado toast]. Graphics: Add a bold yellow arrow connecting the person's finger to the toast. Text: Overlay massive, pop-style text in the middle: '3分钟搞定!' (Done in 3 mins!). Use a thick white outline and drop shadow. Background: A blurred, bright kitchen background. High saturation and contrast.`,
      tags: ["封面", "YouTube", "TikTok", "缩略图"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/21b0d56c-a2a5-463a-9a0e-84100e9d08d8",
      nodeTemplate: { requiresImageInput: true, generatorType: "fast", aspectRatio: "16:9" },
    },
    {
      id: "promo-poster",
      title: "商业促销海报",
      titleEn: "Commercial Promotional Poster",
      description: "设计带有整合文字和高质量产品摄影的专业销售海报",
      prompt: `Design a professional promotional poster for a [Coffee Shop]. Composition: A cinematic close-up of a steaming cup of cappuccino on a rustic wooden table, autumn leaves in the background (cozy atmosphere). Text Integration:
1. Main Title: 'Autumn Special' written in elegant, gold serif typography at the top.
2. Offer: 'Buy One Get One Free' clearly displayed in a modern badge or sticker style on the side.
3. Footer: 'Limited Time Only' in small, clean text at the bottom.
Quality: Ensure all text is perfectly spelled, centered, and integrated into the image's depth of field.`,
      tags: ["海报", "促销", "营销", "商业"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/b65a064a-8519-4907-9497-90f00f9dba17",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
  ],
};
