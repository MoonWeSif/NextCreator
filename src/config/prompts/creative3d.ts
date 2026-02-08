import type { PromptCategory } from "../promptConfig";

// 3D立体模型与等距艺术类提示词
export const creative3dCategory: PromptCategory = {
  id: "creative3d",
  name: "3D立体艺术",
  nameEn: "3D & Isometric Art",
  icon: "Box",
  description: "3D立体模型、等距视图、微缩场景等创意效果",
  prompts: [
    {
      id: "split-view-3d",
      title: "3D分割视图渲染",
      titleEn: "Split View 3D Render",
      description: "创建一半真实一半线框的3D渲染图",
      prompt: `Create a high-quality, realistic 3D render of exactly one instance of the object: [Orange iPhone 17 Pro].
The object must float freely in mid-air and be gently tilted and rotated in 3D space (not front-facing).
Use a soft, minimalist dark background in a clean 1080×1080 composition.
Left Half — Full Realism
The left half of the object should appear exactly as it looks in real life
— accurate materials, colors, textures, reflections, and proportions.
This half must be completely opaque with no transparency and no wireframe overlay.
No soft transition, no fading, no blending.
Right Half — Hard Cut Wireframe Interior
The right half must switch cleanly to a wireframe interior diagram.
The boundary between the two halves must be a perfectly vertical, perfectly sharp, crisp cut line, stretching straight from the top edge to the bottom edge of the object.
No diagonal edges, no curved slicing, no gradient.
The wireframe must use only two line colors:
Primary: white (≈80% of all lines)
Secondary: a color sampled from the dominant color of the realistic half (<20% of lines)
The wireframe lines must be thin, precise, aligned, and engineering-style.
Every wireframe component must perfectly match the geometry of the object.`,
      tags: ["3D", "产品", "线框", "设计"],
      source: "@michalmalewicz",
      previewImage: "https://pbs.twimg.com/media/G7LmGCQWYAAfp47?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "usa-3d-diorama",
      title: "美国地标3D立体模型",
      titleEn: "USA 3D Diorama with Landmarks",
      description: "创建美国地标的等距3D立体模型",
      prompt: `Create a high-detail 3D isometric diorama of the entire United States, where each state is represented as its own miniature platform. Inside each state, place a stylized, small-scale 3D model of that state's most iconic landmark. Use the same visual style as a cute, polished 3D city diorama: soft pastel colors, clean materials, smooth rounded forms, gentle shadows, and subtle reflections. Each landmark should look like a miniature model, charming, simplified, but clearly recognizable. Arrange the states in accurate geographical layout, with consistent lighting and perspective. Include state labels and landmark labels in a clean, modern font, floating above or near each model.`,
      tags: ["3D", "地图", "地标", "立体模型"],
      source: "@DataExec",
      previewImage: "https://pbs.twimg.com/media/G7LGpq0XAAAxcIP?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "isometric-home-office",
      title: "3D等距居家办公室",
      titleEn: "3D Isometric Home Office",
      description: "创建居家办公室的3D等距视图",
      prompt: `Generate a 3D isometric colored illustration of me working from home, filled with various interior details. The visual style should be rounded, polished, and playful. --ar 1:1

[Additional details: a bichon frise and 3 monitors]`,
      tags: ["3D", "等距", "居家办公", "插画"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G7MEwTWWEAA1DkO?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "city-tallest-buildings",
      title: "城市最高建筑3D视图",
      titleEn: "City's Tallest Buildings 3D View",
      description: "创建城市最高建筑的迷你3D视图",
      prompt: `Present a clear, side miniature 3D cartoon view of [YOUR CITY] tallest buildings. Use minimal textures with realistic materials and soft, lifelike lighting and shadows. Use a clean, minimalistic composition showing exactly the three tallest buildings in Sopot, arranged from LEFT to RIGHT in STRICT descending height order. The tallest must appear visibly tallest, the second must be clearly shorter than the first, and the third must be clearly shorter than the second.
All buildings must follow accurate relative proportions: if a building is taller in real life, it MUST be taller in the image by the same approximate ratio. No building may be visually stretched or compressed.
Each building should stand separately on a thin, simple ceramic base. Below each base, centered text should display:
Height in meters — semibold sans-serif, medium size
Year built — lighter-weight sans-serif, smaller size, directly beneath the height text
Provide consistent padding, spacing, leading, and kerning. Write "YOUR CITY NAME" centered above the buildings, using a medium-sized sans-serif font.
 No building top should overlap or touch the text above.Use accurate architectural proportions based on real-world references.Maintain consistent camera angle and identical scale for each building model.
No forced perspective. Use straight-on orthographic-style rendering. Do not exaggerate or stylize size differences beyond proportional accuracy.

Use a square 1080×1080 composition.Use a clean, neutral background. Ensure no extra objects are present.`,
      tags: ["3D", "建筑", "城市", "信息图"],
      source: "@michalmalewicz",
      previewImage: "https://pbs.twimg.com/media/G7GOJ7WW4AAEsNE?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "miniature-swimming-pool",
      title: "微型游泳池立体模型",
      titleEn: "Miniature Swimming Pool Diorama",
      description: "超现实微型世界拼贴海报,将容器变成游泳池",
      prompt: `Surreal miniature-world collage poster featuring an oversized open blue Nivea-style tin repurposed as a whimsical swimming pool filled with glossy white "cream-water."
Tiny sunbathers float in pastel swim rings, lounge on miniature deck chairs, and slide into the cream pool from a small blue slide.
The background is a soft, warm, lightly textured countertop surface subtle marble or matte stone, evenly lit, no heavy veins or visual noise.
Keep the scene grounded with soft shadows beneath props and figures.
Surrounding the tin, keep the playful diorama elements: a small wooden deck with micro figures, pastel umbrellas, lounge chairs, and compact handcrafted accessories. Maintain the hovering pastel inflatables and plush cloud-like shapes, but ensure they feel like stylised decorative objects staged above the countertop.
Preserve the soft, high-saturation, toy-like aesthetic with plush textures, pastel gradients, glitter accents, playful doodles, magazine cut-out graphics, chaotic yet balanced layout, extremely artistic and visually engaging`,
      tags: ["微型", "游泳池", "立体模型", "超现实"],
      source: "@Salmaaboukarr",
      previewImage: "https://pbs.twimg.com/media/G7u3urdXEAA3R5K?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "christmas-ornament-3d",
      title: "圣诞装饰球3D角色",
      titleEn: "Christmas Ornament 3D Character",
      description: "将自己变成圣诞装饰球内的可爱3D角色",
      prompt: `A transparent Christmas bauble hanging by a red ribbon. Inside, a tiny diorama of the person from the reference reimagined as a cute 3d chibi character. He works at a mini futuristic AI desk with three glowing holo-screens showing neural networks and code. Add tiny plants, a mini coffee cup, soft desk lighting, floating UI icons, and snow-glitter at the base. Warm magical Christmas glow, cinematic reflections on glass, cozy high-end diorama aesthetic.

Cinematic lighting, shallow depth of field, soft reflections on the glass, ultra-polished materials, high detail, festive Christmas atmosphere. Whimsical, premium, and heartwarming.`,
      tags: ["圣诞", "装饰球", "3D", "Q版"],
      source: "@CharaspowerAI",
      previewImage: "https://pbs.twimg.com/media/G7vbusrWUAA8omH?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "urban-3d-led",
      title: "城市3D LED显示屏",
      titleEn: "Urban 3D LED Display",
      description: "在城市环境中创建大型L形3D LED屏幕场景",
      prompt: `An enormous L-shaped glasses-free 3D LED screen situated prominently at a bustling urban intersection, designed in an iconic architectural style reminiscent of Shinjuku in Tokyo or Taikoo Li in Chengdu. The screen displays a captivating glasses-free 3D animation featuring [scene description]. The characters and objects possess striking depth and appear to break through the screen's boundaries, extending outward or floating vividly in mid-air. Under realistic daylight conditions, these elements cast lifelike shadows onto the screen's surface and surrounding buildings. Rich in intricate detail and vibrant colors, the animation seamlessly integrates with the urban setting and the bright sky overhead.

----
scene description:
[An adorable giant kitten playfully paws at passing pedestrians, its fluffy paws and curious face extending realistically into the space around the screen.]`,
      tags: ["3D", "LED", "城市", "裸眼3D"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G7jPBxmXwAA7igN?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "floating-country-island",
      title: "漂浮国家岛屿",
      titleEn: "Floating Country Island Diorama",
      description: "创建特定国家形状的漂浮微型岛屿立体模型",
      prompt: `Create an ultra-HD, hyper-realistic digital poster of a floating miniature island shaped like [COUNTRY], resting on white clouds in the sky. Blend iconic landmarks, natural landscapes (like forests, mountains, or beaches), and cultural elements unique to [COUNTRY]. Carve "[COUNTRY]" into the terrain using large white 3D letters. Add artistic details like birds (native to [COUNTRY]), cinematic lighting, vivid colors, aerial perspective, and sun reflections to enhance realism. Ultra-quality, 4K+ resolution. 1080x1080 format.`,
      tags: ["国家", "岛屿", "3D", "立体模型"],
      source: "@TechieBySA",
      previewImage: "https://pbs.twimg.com/media/G75EwP0WkAEpIbm?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "novel-scene-poster",
      title: "小说场景3D海报",
      titleEn: "Novel Scene 3D Poster",
      description: "为小说或电影创建微型立体模型风格的3D海报",
      prompt: `Design a high-quality 3D poster for the movie/novel "[Name to be added]", first retrieving information about the movie/novel and famous scenes.

First, please use your knowledge base to retrieve information about this movie/novel and find a representative famous scene or core location. In the center of the image, construct this scene as a delicate axonometric 3D miniature model. The style should adopt DreamWorks Animation's delicate and soft rendering style. You need to reproduce the architectural details, character dynamics, and environmental atmosphere of that time.

Regarding the background, do not use a simple pure white background. Please create a void environment with faint ink wash diffusion and flowing light mist around the model, with elegant colors, making the image look breathable and have depth.

Finally, for the bottom layout, please generate Chinese text. Center the novel title with a font that matches the original style. Below the title, automatically retrieve and typeset a classic description or quote about this scene from the original work.`,
      tags: ["小说", "电影", "3D海报", "立体模型"],
      source: "@op7418",
      previewImage: "https://pbs.twimg.com/media/G7uUpDraQAAC1ty?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "perfectly-isometric",
      title: "完美等距摄影",
      titleEn: "Perfectly Isometric Photography",
      description: "创建碰巧完美等距的捕捉照片",
      prompt: `Make a photo that is perfectly isometric. It is not a miniature, it is a captured photo that just happened to be perfectly isometric. It is a photo of [subject].`,
      tags: ["等距", "摄影", "几何", "构图"],
      source: "@NanoBanana",
      previewImage: "https://pbs.twimg.com/media/G7qgKDPX0AAEGS9?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "movie-scene-poster",
      title: "影视剧场景3D海报",
      titleEn: "Movie Scene 3D Poster",
      description: "为影视剧或小说创建微型立体模型风格的3D海报",
      prompt: `请为影视剧/小说《需要添加的名称》设计一张高品质的3D海报,需要先检索影视剧/小说信息和著名的片段场景。

首先,请利用你的知识库检索这个影视剧/小说的内容,找出一个最具代表性的名场面或核心地点。在画面中央,将这个场景构建为一个精致的轴侧视角3D微缩模型。风格要采用梦工厂动画那种细腻、柔和的渲染风格。你需要还原当时的建筑细节、人物动态以及环境氛围,无论是暴风雨还是宁静的午后,都要自然地融合在模型的光影里。

关于背景,不要使用简单的纯白底。请在模型周围营造一种带有淡淡水墨晕染和流动光雾的虚空环境,色调雅致,让画面看起来有呼吸感和纵深感,衬托出中央模型的珍贵。

最后是底部的排版,请生成中文文字。居中写上小说名称,字体要有与原著风格匹配的设计感。在书名下方,自动检索并排版一句原著中关于该场景的经典描写或台词,字体使用优雅的衬线体。整体布局要像一个高级的博物馆藏品铭牌那样精致平衡。`,
      tags: ["电影", "小说", "3D海报", "场景"],
      source: "@op7418",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/movie_scene_poster.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "crystal-ball-story",
      title: "水晶球故事场景",
      titleEn: "Crystal Ball Story Scene",
      description: "水晶球内呈现迷你立体世界",
      prompt: `一枚精致的水晶球静静摆放在窗户旁温暖柔和的桌面上,背景虚化而朦胧,暖色调的阳光轻柔地穿透水晶球,折射出点点金光,温暖地照亮了四周的微暗空间。水晶球内部自然地呈现出一个以 {嫦娥奔月} 为主题的迷你立体世界,细腻精美而梦幻的3D景观,人物与物体皆是可爱的Q版造型,精致而美观,彼此之间充满灵动的情感互动。整体氛围充满了东亚奇幻色彩,细节极为丰富,呈现出魔幻现实主义般的奇妙质感。整个场景如诗如梦,华美而典雅,散发着温馨柔和的光芒,仿佛在温暖的光影中被赋予了生命。`,
      tags: ["水晶球", "3D", "场景", "奇幻"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/1a623fc0c48774dd44d9ac8749b5ecc2eb91f3b1911eb47f2bc58e08f0442491/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d7463504a594a71576853694c42742d4b4d6e7579442e706e673f763d31",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
  ],
};
