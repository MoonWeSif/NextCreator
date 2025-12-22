import type { PromptCategory } from "../promptConfig";

// 教育知识类提示词
export const educationCategory: PromptCategory = {
  id: "education",
  name: "教育知识",
  nameEn: "Education & Knowledge",
  icon: "GraduationCap",
  description: "将文本概念转换为清晰的教育向量插图",
  prompts: [
    {
      id: "concept-infographic",
      title: "概念信息图",
      titleEn: "Concept Visualization",
      description: "将文本概念转换为清晰的教育向量插图",
      prompt: `Create an educational infographic explaining [Photosynthesis]. Visual Elements: Illustrate the key components: The Sun, a green Plant, Water (H2O) entering roots, Carbon Dioxide (CO2) entering leaves, and Oxygen (O2) being released. Style: Clean, flat vector illustration suitable for a high school science textbook. Use arrows to show the flow of energy and matter. Labels: Label each element clearly in English.`,
      tags: ["教育", "信息图", "科学", "插画"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/bfaee21b-d6da-4345-9340-e786ce07dbed",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "travel-journal",
      title: "儿童风格旅行日记",
      titleEn: "Kids' Crayon Travel Journal",
      description: "为城市生成儿童蜡笔风格的旅行日记插图",
      prompt: `Please create a vibrant, child-like crayon-style vertical (9:16) illustration titled "{City Name} Travel Journal."
The artwork should look as if it were drawn by a curious child using colorful crayons, featuring a soft, warm light-toned background (such as pale yellow), combined with bright reds, blues, greens, and other cheerful colors to create a cozy, playful travel atmosphere.

I. Main Scene: Travel-Journal Style Route Map
In the center of the illustration, draw a "winding, zigzagging travel route" with arrows and dotted lines connecting multiple locations.

II. Surrounding Playful Elements (Auto-adapt to the City)
Add many cute doodles and child-like decorative elements around the route, such as:
1. Adorable travel characters - A child holding a local snack, A little adventurer with a backpack
2. Q-style hand-drawn iconic landmarks
3. Funny signboards - "Don't get lost!", "Crowds ahead!", "Yummy food this way!"
4. Sticker-style short phrases
5. Cute icons of local foods
6. Childlike exclamations

III. Overall Art Style Requirements
- Crayon / children's hand-drawn travel diary style
- Bright, warm, colorful palette
- Cozy but full and lively composition
- Emphasize the joy of exploring
- All text should be in a cute handwritten font`,
      tags: ["旅行", "儿童", "蜡笔画", "日记"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G69WHFDW4AAv0TK?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "financial-sankey",
      title: "财务桑基图",
      titleEn: "Financial Sankey Diagram",
      description: "创建专业的财务桑基图可视化",
      prompt: `[Subject]: A professional financial Sankey diagram visualizing the Income Statement of a major corporation, in the style of "App Economy Insights" and US corporate financial reports.

[Visual Style]: High-fidelity vector infographic, clean minimalist aesthetic, flat design. The background is a clean, very light grey or off-white.

[Color Strategy - CRITICAL]:
Analyze the [Insert Brand Name Here] logo. Extract its primary brand color.
Use this primary color as the dominant theme for the main revenue flows and profit blocks.
Create a harmonious color palette based on this primary color.

[Composition & Structure]:
Flow: A horizontal flow from Left (Revenue Sources) to Right (Net Profit).
Texture: The connecting paths (flows) must appear "silky smooth" with elegant Bezier curves, looking like liquid ribbons, not jagged lines.
Iconography: On the left side, include specific, minimalist flat vector icons representing the business segments.
Branding: Place the official logo clearly at the top center.

[Details]: High resolution, 4k, sharp typography (sans-serif), professional data visualization layout.`,
      tags: ["财务", "数据可视化", "桑基图", "商业"],
      source: "@bggg_ai",
      previewImage: "https://pbs.twimg.com/media/G7P3UgNaYAAd1HN?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
