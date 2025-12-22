import type { PromptCategory } from "../promptConfig";

// 头像社交类提示词
export const avatarsCategory: PromptCategory = {
  id: "avatars",
  name: "头像社交",
  nameEn: "Social Networking & Avatars",
  icon: "User",
  description: "3D盲盒风格头像、宠物表情包和Y2K风格海报",
  prompts: [
    {
      id: "blindbox-avatar",
      title: "3D盲盒风格头像",
      titleEn: "3D Blind Box Style Avatar",
      description: "将肖像转换为可爱的C4D风格泡泡玛特玩具角色",
      prompt: `Transform the person in the uploaded photo into a cute 3D Pop Mart style blind box character. Likeness: Keep key features recognizable: [hair color, glasses, hairstyle]. Style: C4D rendering, occlusion render, cute Q-version, soft studio lighting, pastel colors. Background: A simple, solid matte color background (e.g., soft blue). Detail: The character should have a smooth, plastic toy texture with a slight glossy finish. Facing forward, friendly expression.`,
      tags: ["盲盒", "头像", "3D", "泡泡玛特"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/da445a7e-cf15-44be-ad18-d66b8fb78ae8",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "pet-meme",
      title: "宠物表情包",
      titleEn: "Pet Meme Creation",
      description: "将宠物照片转换为极简主义的手绘搞笑贴纸",
      prompt: `Turn this photo of my [cat/dog] into a funny hand-drawn WeChat sticker. Style: Minimalist ugly-cute line drawing (doodle style). White background. Expression: Exaggerate the animal's expression to look extremely shocked/judgemental/lazy (based on photo). Accessories: Add cute little doodles like sweat drops, question marks, or sparkles around the head. Text: Add handwritten text at the bottom: 'So Dumb'. Ensure the text style is messy and funny.`,
      tags: ["宠物", "表情包", "贴纸", "搞笑"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/9fc5866a-e62e-43b9-af83-8fa5f6421d33",
      nodeTemplate: { requiresImageInput: true, generatorType: "fast", aspectRatio: "1:1" },
    },
    {
      id: "y2k-scrapbook",
      title: "Y2K剪贴簿海报",
      titleEn: "Y2K Scrapbook Poster with Multiple Poses",
      description: "创建带有多种姿势的Y2K风格剪贴簿海报",
      prompt: `"facelock_identity": "true",
"accuracy": "100%",
scene: "Colorful Y2K scrapbook poster aesthetic, vibrant stickers, multiple subjects wearing the same outfit and hairstyle with different poses and cutouts, colorful strokes and lines, frameless collage style. Includes: close-up shot with heart-shape fingers, full-body squatting pose supporting chin while holding a white polaroid camera, mid-shot touching cheek while blowing pink bubblegum, mid-shot smiling elegantly while holding a cat, seated elegantly with one eye winking and peace sign, and mid-shot holding daisy flowers. Holographic textures, pastel gradients, glitter accents, playful doodles, magazine cut-out graphics, chaotic yet balanced layout, extremely artistic and visually engaging",
main_subject: {
"description": "A young Y2K-styled woman as the main focus in the center of the scrapbook collage.",
"style_pose": "Playful and confident Y2K pose — slight side hip pop, one hand holding a lens-flare keychain, face toward the camera with a cute-cool expression, slight pout, candid early-2000s photo vibe."
}
outfit: {
"top": "Cropped oversized sweater in pastel color with embroidered patches",
"bottom": "pastel skirt with a white belt",
"socks": "White ankle socks with colorful pastel stripes",
"shoes": "white sneakers"
}`,
      tags: ["Y2K", "剪贴簿", "海报", "复古"],
      source: "@ShreyaYadav___",
      previewImage: "https://pbs.twimg.com/media/G7JduAQa8AEofUY?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "japanese-snap",
      title: "日式快照风格",
      titleEn: "Japanese High School Student Snap Photo",
      description: "创建日本高中生风格的随拍照片",
      prompt: `A daily snapshot taken with a low-quality disposable camera. A clumsy photo taken by a Japanese high school student. (Aspect ratio 3:2 is recommended)`,
      tags: ["日式", "快照", "一次性相机", "学生"],
      source: "@SSSS_CRYPTOMAN",
      previewImage: "https://pbs.twimg.com/media/G6z7gUVa0AMf1-G?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "3:2" },
    },
    {
      id: "skin-analysis",
      title: "AI皮肤分析",
      titleEn: "AI Skin Analysis and Skincare Routine",
      description: "分析皮肤并提供护肤建议",
      prompt: `You are a professional skin analyst and skincare expert.
The user uploads a close-up photo of their face and may add short notes (age, allergies, current routine, pregnancy, etc.). Use ONLY what you see in the image plus the user text.
1. Carefully inspect the skin: shine, pores, redness, blemishes, spots, texture, flaking, fine lines, dark circles, etc.
2. Decide the main skin type: oily, dry, normal, combination, or sensitive.
3. Identify visible issues: acne/breakouts, blackheads/whiteheads, post-acne marks, hyperpigmentation, redness, enlarged pores, uneven texture, dehydration, fine lines, dark circles, puffiness, etc.

RESPONSE FORMAT (very important)
Your answer must be plain text in this exact structure:
1. First, write 3–6 short lines describing the skin and problems
2. On a new line, write the word in caps: SKIN ROUTINE
3. Under SKIN ROUTINE, give at least 5 numbered steps (1., 2., 3., …).
Each step must include what to do, product TYPE and key INGREDIENTS to look for, when to use it, and 1 short practical instruction.`,
      tags: ["皮肤分析", "护肤", "美容", "AI分析"],
      source: "@Samann_ai",
      previewImage: "https://pbs.twimg.com/media/G7QJQpOXEAAqAP1?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "fast", aspectRatio: "1:1" },
    },
  ],
};
