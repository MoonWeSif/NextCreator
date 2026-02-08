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
    {
      id: "line-sticker-pack",
      title: "LINE风格表情包",
      titleEn: "LINE Style Sticker Pack",
      description: "生成Q版LINE风格半身像表情包",
      prompt: `为我生成图中角色的绘制 Q 版的,LINE 风格的半身像表情包,注意头饰要正确
彩色手绘风格,使用 4x6 布局,涵盖各种各样的常用聊天语句,或是一些有关的娱乐 meme
其他需求:不要原图复制。所有标注为手写简体中文。
生成的图片需为 4K 分辨率 16:9`,
      tags: ["LINE", "表情包", "Q版", "聊天"],
      source: "LINUX DO@heiyub",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/q_version_meme_pack.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "24-emoji-pack",
      title: "24格表情包制作器",
      titleEn: "24 Emoji Pack Maker",
      description: "生成24种不同表情的Q版表情包",
      prompt: `A 4K resolution, 16:9 image featuring a character sheet with a 4x6 grid layout. The style is cute Q-version (Chibi) anime art, resembling LINE stickers, with half-body portraits. white backgroud.
Subject: The character from the reference image. Please redesign the poses creatively instead of copying the original image directly. Crucial: Ensure the character's headwear and accessories are drawn correctly and consistently.
Expressions and Actions:
第一排:
1.早安: 面带灿烂的笑容,举起左手挥手打招呼,充满活力。
2.谢谢: 闭着眼睛,双手乖巧地放在身前,身体微微前倾鞠躬,显得非常礼貌和感激。
3.疑惑: 歪着头,睁大眼睛一脸茫然,头顶周围冒出几个问号。
4.哈哈哈: 闭着眼张嘴大笑,肩膀似乎在抖动,周围有笑声符号,显得非常开心。
5.呜呜呜: 双手握拳放在胸口,两条宽面条泪水直流,张大嘴巴痛哭,看起来很委屈。
6.晚安: 戴趴在枕头上睡着了,鼻子上还吹着一个鼻涕泡,神态安详。
第二排:
7. 好的: 俏皮地眨了一只眼(Wink),竖起右手的大拇指,表示赞同或确认。
8. 不要: 双手在胸前交叉成X型,眼神冷淡地看向一边,表示坚决的拒绝。
9. 震惊: 脸色发青(线条阴影),双眼翻白失去高光,嘴巴张成圆形,受到极度惊吓。
10. 生气: 咬牙切齿,眉头紧锁,周围冒着火光和怒气符号,看起来怒火中烧。
11. 吃瓜: 手里捧着一片西瓜在吃,眼神向前看,一副"看热闹不嫌事大"的旁观者神态。
12. 害羞: 满脸通红,双手捂住嘴巴,眼神羞涩地看向旁边,显得很不好意思。
第三排:
13. 哼: 扭过头去不看人,闭着眼吐出一口气,一副傲娇、不屑或生闷气的样子。
14. 观察: 手里拿着一个巨大的放大镜放在右眼前,瞪大眼睛仔细查看着什么。
15. 有点意思: 单手托着下巴,眼神深邃,嘴角露出一抹玩味的微笑,似乎发现了有趣的事情。
16. 盯~: 变成了简笔画的"豆豆眼",嘴巴抿成一条线,面无表情,大脑一片空白。
17. 无语: 额头挂着一滴巨大的冷汗,脸色阴沉(蓝色阴影),眼神呆滞,表示极度无奈。
18. 加油: 双手各挥舞一面红色小旗子,张嘴欢呼,充满激情地为他人应援。
第四排:
19. 暗中观察: 躲在一堵墙后面,只探出半个脑袋和一只手,眼神犀利地窥视。
20. 计划通: 露出阴险得逞的坏笑,眼神犀利(甚至有反光特效),仿佛一切尽在掌握之中。
21. 累了: 像一滩液体一样瘫软在地上,眼神涣散,似乎魂都丢了,精疲力尽。
22. 赞: 双眼变成了金色的星星,双手握在胸前,一脸崇拜和兴奋的样子。
23. 拜拜: 背对镜头,右手举过头顶向后挥手,只留下一个潇洒的背影。
24. 退下: 戴着黑色墨镜,单手向外挥动,神情冷酷高傲,像大佬一样屏退左右。
Details: All text annotations and sound effects must be in handwritten Simplified Chinese. The illustrations should have clean outlines and flat colors typical of sticker packs.`,
      tags: ["表情包", "24格", "Q版", "全面"],
      source: "@Moeary",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/chibi_sticker_pack.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
