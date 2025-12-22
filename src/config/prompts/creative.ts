import type { PromptCategory } from "../promptConfig";

// 创意实验类提示词
export const creativeCategory: PromptCategory = {
  id: "creative",
  name: "创意实验",
  nameEn: "Creative Experiments",
  icon: "Sparkles",
  description: "突破常规的创意构图、人群生成、极简主义和时间一致性",
  prompts: [
    {
      id: "recursive-image",
      title: "递归视觉效果",
      titleEn: "Recursive Visuals",
      description: "展示模型处理无限循环逻辑的能力(Droste效果)",
      prompt: `recursive image of an orange cat sitting in an office chair holding up an iPad. On the iPad is the same cat in the same scene holding up the same iPad. Repeated on each iPad.`,
      tags: ["递归", "创意", "Droste效果", "猫"],
      source: "@venturetwins",
      previewImage: "https://github.com/user-attachments/assets/f7ef5a84-e2bf-4d4e-a93e-38a23a21b9ef",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "aging-through-years",
      title: "岁月变迁",
      titleEn: "Aging Through the Years",
      description: "展示单一主体的时间一致性和老化效果",
      prompt: `Generate the holiday photo of this person through the ages up to 80 years old`,
      tags: ["老化", "时间序列", "人像", "创意"],
      source: "@dr_cintas",
      previewImage: "https://github.com/user-attachments/assets/74fced67-0715-46d3-b788-d9ed9e98873b",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "star-wars-waldo",
      title: "星球大战找茬图",
      titleEn: "Star Wars Where's Waldo",
      description: "复杂人群和特定角色识别的测试",
      prompt: `A where is waldo image showing all Star Wars characters on Tatooine

First one to pull this off. First take. Even Waldo is there.`,
      tags: ["星球大战", "找茬", "人群", "创意"],
      source: "@creacas",
      previewImage: "https://github.com/user-attachments/assets/439317c2-4be8-4b28-803f-36427ecca31e",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "coordinate-visualization",
      title: "坐标可视化",
      titleEn: "Coordinate Visualization",
      description: "根据经纬度坐标生成特定地点和时间的场景",
      prompt: `35.6586° N, 139.7454° E at 19:00`,
      tags: ["坐标", "地点", "创意", "极简"],
      source: "Replicate",
      previewImage: "https://github.com/user-attachments/assets/8629b88a-b872-43e2-a19e-855542702ac2",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "16:9" },
    },
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
      id: "us-food-map",
      title: "美国食物地图",
      titleEn: "US Map Made of Famous Foods",
      description: "用各州著名食物制作的美国地图",
      prompt: `create a map of the US where every state is made out of its most famous food (the states should actually look like they are made of the food, not a picture of the food). Check carefully to make sure each state is right.`,
      tags: ["地图", "食物", "创意", "美国"],
      source: "@emollick",
      previewImage: "https://pbs.twimg.com/media/G7I5dbiWwAAYOox?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "emoji-combination",
      title: "表情符号组合",
      titleEn: "Emoji Combination",
      description: "以Google风格组合表情符号",
      prompt: `combine these emojis: 🍌 + 😎, on a white background as a google emoji design`,
      tags: ["表情符号", "设计", "创意", "Google"],
      source: "@NanoBanana",
      previewImage: "https://pbs.twimg.com/media/G7PmjRBXgAAVKXd?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "1:1" },
    },
    {
      id: "torn-paper-art",
      title: "撕纸艺术效果",
      titleEn: "Torn Paper Art Effect",
      description: "在图片特定区域添加撕纸效果",
      prompt: `task: "edit-image: add widened torn-paper layered effect"

base_image:
  use_reference_image: true
  preserve_everything:
    - character identity
    - facial features and expression
    - hairstyle and anatomy
    - outfit design and colors
    - background, lighting, composition
    - overall art style

rules:
  - Only modify the torn-paper interior areas.
  - Do not change pose, anatomy, proportions, clothing details, shading, or scene elements.

effects:
  - effect: "torn-paper-reveal"
    placement: "across chest height"
    description:
      - Add a wide, natural horizontal tear across the chest area.
      - The torn interior uses the style defined in interior_style.

  - effect: "torn-paper-reveal"
    placement: "lower abdomen height"
    description:
      - Add a wide horizontal tear across the lower abdomen.
      - The torn interior uses the style defined in interior_style.

interior_style:
  mode: "line-art"
  style_settings:
    line-art:
      palette: "monochrome"
      line_quality: "clean, crisp"
      paper: "notebook paper with subtle ruled lines"`,
      tags: ["撕纸", "艺术", "编辑", "创意"],
      source: "@munou_ac",
      previewImage: "https://pbs.twimg.com/media/G7OpzpjbAAArAAS?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
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
      id: "whiteboard-marker-art",
      title: "白板马克笔艺术",
      titleEn: "Whiteboard Marker Art",
      description: "模拟玻璃白板上的褪色马克笔画",
      prompt: `Create a photo of vagabonds musashi praying drawn on a glass whiteboard in a slightly faded green marker`,
      tags: ["白板", "马克笔", "艺术", "创意"],
      source: "@nicdunz",
      previewImage: "https://github.com/user-attachments/assets/b399c4d9-151b-4e15-9a40-f092f7a892b9",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "4:3" },
    },
    {
      id: "chalkboard-anime",
      title: "黑板动漫画",
      titleEn: "Chalkboard Anime Art Documentation",
      description: "黑板上的动漫角色粉笔画的写实记录",
      prompt: `{
  "intent": "Photorealistic documentation of a specific chalkboard art piece featuring a single anime character, capturing the ephemeral nature of the medium within a classroom context.",
  "frame": {
    "aspect_ratio": "4:3",
    "composition": "A centered medium shot focusing on the chalkboard mural. The composition includes the teacher's desk in the immediate foreground to provide scale, with the artwork of the single character dominating the background space.",
    "style_mode": "documentary_realism, texture-focused, ambient naturalism"
  },
  "subject": {
    "primary_subject": "A large-scale, intricate chalk drawing of Boa Hancock from 'One Piece' on a standard green classroom blackboard.",
    "visual_details": "The illustration depicts Boa Hancock in a commanding pose, positioned centrally on the board. She is drawn with her signature long, straight black hair with a hime cut, rendered using dense application of black chalk with white accents for sheen."
  },
  "environment": {
    "location": "A standard Japanese school classroom.",
    "foreground_elements": "A wooden teacher's desk occupies the lower foreground. Scattered across the surface are a yellow box of colored chalks, loose sticks of red, white, and blue pastel chalk, and a dust-covered black felt eraser."
  },
  "lighting": {
    "type": "Diffuse ambient classroom lighting.",
    "quality": "Soft, nondirectional illumination provided by overhead fluorescent fixtures mixed with daylight from windows on the left."
  }
}`,
      tags: ["黑板", "动漫", "粉笔画", "教室"],
      source: "@IamEmily2050",
      previewImage: "https://pbs.twimg.com/media/G65Uh3ebkAEqbv5?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "4:3" },
    },
    {
      id: "cinematic-keyframe",
      title: "电影关键帧生成器",
      titleEn: "Cinematic Keyframe Generator",
      description: "从参考图片生成电影级关键帧和故事板",
      prompt: `<role>
You are an award-winning trailer director + cinematographer + storyboard artist. Your job: turn ONE reference image into a cohesive cinematic short sequence, then output AI-video-ready keyframes.
</role>

<input>
User provides: one reference image (image).
</input>

<non-negotiable rules - continuity & truthfulness>
1) First, analyze the full composition: identify ALL key subjects (person/group/vehicle/object/animal/props/environment elements) and describe spatial relationships and interactions.
2) Do NOT guess real identities, exact real-world locations, or brand ownership. Stick to visible facts.
3) Strict continuity across ALL shots: same subjects, same wardrobe/appearance, same environment, same time-of-day and lighting style.
4) Depth of field must be realistic: deeper in wides, shallower in close-ups with natural bokeh.
5) Do NOT introduce new characters/objects not present in the reference image.
</non-negotiable rules>

<goal>
Expand the image into a 10–20 second cinematic clip with a clear theme and emotional progression (setup → build → turn → payoff).
</goal>

<step 5 - contact sheet output>
You MUST output ONE single master image: a Cinematic Contact Sheet / Storyboard Grid containing ALL keyframes in one large image.
- Default grid: 3x3. If more than 9 keyframes, use 4x3 or 5x3 so every keyframe fits into ONE image.
Requirements:
1) The single master image must include every keyframe as a separate panel.
2) Each panel must be clearly labeled: KF number + shot type + suggested duration.
3) Strict continuity across ALL panels.
</step 5>`,
      tags: ["电影", "关键帧", "故事板", "视频"],
      source: "@underwoodxie96",
      previewImage: "https://pbs.twimg.com/media/G64FgZKXMAAXP_g?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "photo-book-magazine",
      title: "写真集风格杂志封面",
      titleEn: "Photo Book Style Magazine Cover",
      description: "创建充分利用9:16比例的写真集风格杂志封面,带精确坐标",
      prompt: `Create a beautiful, photo book style magazine cover that fully utilizes the 9:16 aspect ratio. Place the attached person at the precise coordinates of [latitude/longitude coordinate], seamlessly blending them into the scene as if they are sightseeing. Approach this task with the understanding that this is a critical page that will significantly influence visitor numbers. NEGATIVE: coordinate texts`,
      tags: ["杂志", "写真集", "封面", "旅行"],
      source: "@minchoi",
      previewImage: "https://pbs.twimg.com/media/G70ZJFCXcAAn3F2?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "9:16" },
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
      id: "ironing-wrinkles",
      title: "超现实熨斗去皱",
      titleEn: "Ironing Out Wrinkles",
      description: "用微型熨斗熨平皱纹的超现实抗衰老概念图",
      prompt: `{
  "prompt": "An award-winning, hyper-realist macro photograph in the style of high-concept editorial art. The image features an extreme close-up of an elderly woman's eye and cheekbone. A miniature, toy-like white and blue clothes iron is positioned on her skin, actively pressing down and ironing out deep wrinkles and crow's feet, leaving a streak of unnaturally smooth skin in its wake. A thin white cord trails organically across the texture of her face. The image demands microscopic clarity, capturing mascara clumps, skin pores, and vellus hairs. The lighting is an unforgiving, high-contrast hard flash typical of avant-garde fashion photography.",
  "subject_details": {
    "main_subject": "Elderly woman's face (Macro topography of aging skin)",
    "object": "Miniature white and blue iron with realistic plastic textures and a trailing cord",
    "action": "The iron is creating a visible, flattened path through the wrinkles"
  },
  "artistic_style": {
    "genre": ["Contemporary Pop-Surrealism", "Satirical Editorial", "Visual Metaphor"],
    "aesthetic": ["Maurizio Cattelan style", "Vivid Color", "Commercial Kitsch", "Tactile Realism"],
    "lighting": "Studio Ring Flash, High-Key, Hard Shadows, Glossy finish"
  },
  "mood": "Provocative, satirical, disturbingly pristine, humorous yet critical"
}`,
      tags: ["超现实", "抗衰老", "微型", "概念艺术"],
      source: "@egeberkina",
      previewImage: "https://pbs.twimg.com/media/G7b8YyVXQAALtxS?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "4:3" },
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
      id: "wide-angle-phone-edit",
      title: "极端广角手机编辑",
      titleEn: "Extreme Wide Angle Phone Screen Replacement",
      description: "用极端广角编辑照片并替换手机屏幕内容",
      prompt: `{
  "edit_type": "extreme_wide_angle_phone_edit",
  "source": {
    "_hint": "Base for editing the person, clothing, and atmosphere of the original image. No new characters allowed.",
    "mode": "EDIT",
    "preserve_elements": ["Person", "Face", "Hairstyle", "Clothing", "Environment style"],
    "change_rules": {
      "camera_angle": "Ultra-wide or fisheye lens (equivalent to 12-18mm)",
      "angle_options": ["Looking up from directly in front", "Looking down from directly in front", "Extreme low angle", "High angle", "Tilted composition"],
      "perspective_effect": "Nearby objects are exaggerated, distant objects become smaller",
      "body_parts_close_to_camera": "Bring 1-3 body parts extremely close to the camera",
      "pose_variety": ["Extending one hand/leg toward the camera", "Squatting or lying on stomach halfway", "Sitting on the ground or an object", "Lying on the ground with legs pointed at camera", "Leaning body sharply toward the camera", "Twisting body for dynamic pose"]
    },
    "phone_handling": {
      "allowed": true,
      "grip_options": ["One-handed", "Two-handed", "Low angle", "High angle", "Tilted", "Sideways", "Close to chest", "Close to waist", "Casual grip"],
      "screen_replacement": {
        "target": "Only the smartphone screen portion displayed in the image",
        "source": "Second reference image",
        "fitting_rules": "Strictly match the screen shape, no stretching or compression"
      }
    },
    "environment_consistency": {
      "location": "Maintain the same location as the original image",
      "lighting": "Maintain direction and intensity"
    }
  }
}`,
      tags: ["广角", "手机", "编辑", "鱼眼"],
      source: "@qisi_ai",
      previewImage: "https://pbs.twimg.com/media/G7gEwj8bIAAcFM2?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "shop-window-cartoon",
      title: "橱窗卡通倒影",
      titleEn: "Shop Window Cartoon Reflection",
      description: "创建站在橱窗旁边的照片,橱窗内显示卡通版本",
      prompt: `{
  "PROMPT": "Create a bright, high-end street-fashion photograph of the woman from the reference image, keeping her face, hair, body & outfit exactly the same. She stands outside a luxury toy-shop window, gently touching the glass. Inside the window display, place a full-height cartoon-style doll designed to resemble her—same features, hair, and outfit—transformed into a cute, big-eyed, stylized animated character. Crisp lighting, premium street-fashion look, realistic reflections, face unchanged.",
  "settings": {
    "style": "high-end street fashion",
    "lighting": "crisp and bright",
    "environment": "outside luxury toy-shop window",
    "subject": "woman from reference image",
    "focus": ["face", "hair", "body", "outfit"],
    "additional_elements": [
      {
        "type": "doll",
        "style": "cartoon-style, big-eyed, stylized",
        "location": "inside window display",
        "resemblance": "exact features, hair, outfit of woman"
      }
    ],
    "reflections": "realistic",
    "photorealism": true
  }
}`,
      tags: ["橱窗", "卡通", "倒影", "街拍"],
      source: "@xmiiru_",
      previewImage: "https://pbs.twimg.com/media/G7drMCfXkAAN3w0?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
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
      id: "trans-dimensional-pour",
      title: "跨维度液体倾倒",
      titleEn: "Trans-Dimensional Liquid Pour",
      description: "物理世界的液体倾倒进数字屏幕的超现实场景",
      prompt: `{
  "meta": {
    "type": "Creative Brief",
    "genre": "Hyper-realistic Surrealism",
    "composition_style": "Composite Portrait"
  },
  "scene_architecture": {
    "viewpoint": {
      "type": "Photographic",
      "angle": "High-angle / Looking down",
      "framing": "Tight on central subject"
    },
    "dimensional_hierarchy": {
      "rule": "Scale disparity for surreal effect",
      "dominant_element": "iPhone 17 Pro Max (Super-scaled)",
      "subordinate_elements": ["Blue Book (Miniature)", "Pen (Miniature)"]
    }
  },
  "realm_physical": {
    "description": "The real-world environment surrounding the device.",
    "environment": {
      "surface": "Wooden table",
      "texture_attributes": ["rich grain", "tactile", "worn"]
    },
    "active_agent": {
      "identity": "Human Hand (Real)",
      "action": "Pouring"
    },
    "held_object": {
      "item": "Bottle",
      "state": "Chilled (visible condensation)",
      "contents": {
        "substance": "Water",
        "color": "Light Green",
        "state": "Liquid flow"
      }
    }
  },
  "realm_digital": {
    "description": "The content displayed on the screen.",
    "container_device": {
      "model": "iPhone 17 Pro Max",
      "state": "Screen ON"
    },
    "screen_content": {
      "subject_identity": "Person from reference image",
      "expression": "Happy / Smiling",
      "held_object_digital": {
        "item": "Drinking Glass",
        "initial_state": "Empty (waiting for pour)"
      }
    }
  },
  "surreal_bridge_event": {
    "description": "The interaction connecting the physical and digital realms.",
    "action_type": "Trans-dimensional Fluid Dynamics",
    "source": "Physical bottle contents",
    "destination": "Digital glass in screen"
  }
}`,
      tags: ["跨维度", "液体", "超现实", "手机"],
      source: "@YaseenK7212",
      previewImage: "https://pbs.twimg.com/media/G7Uz7jZXoAAGEV0?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "4:5" },
    },
  ],
};
