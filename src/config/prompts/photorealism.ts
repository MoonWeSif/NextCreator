import type { PromptCategory } from "../promptConfig";

// 照片写实类提示词
export const photorealismCategory: PromptCategory = {
  id: "photorealism",
  name: "照片写实",
  nameEn: "Photorealism & Aesthetics",
  icon: "Camera",
  description: "高保真照片级别的提示词,包含复杂光线、纹理和特定时代风格",
  prompts: [
    {
      id: "hyper-realistic-crowd",
      title: "超写实人群合影",
      titleEn: "Hyper-Realistic Crowd Composition",
      description: "处理复杂构图,包含多个人物和特定光线",
      prompt: `Create a hyper-realistic, ultra-sharp, full-color large-format image featuring a massive group of celebrities from different eras, all standing together in a single wide cinematic frame. The image must look like a perfectly photographed editorial cover with impeccable lighting, lifelike skin texture, micro-details of hair, pores, reflections, and fabric fibers.

GENERAL STYLE & MOOD: Photorealistic, 8k, shallow depth of field, soft natural fill light + strong golden rim light. High dynamic range, calibrated color grading. Skin tones perfectly accurate. Crisp fabric detail with individual threads visible. Balanced composition, slightly wide-angle lens (35mm), center-weighted. All celebrities interacting naturally, smiling, posing, or conversing. Minimal background noise, but with enough world-building to feel real.

THE ENVIRONMENT: A luxurious open-air rooftop terrace at sunset overlooking a modern city skyline. Elements include: Warm golden light wrapping around silhouettes. Polished marble.`,
      tags: ["人像", "群像", "写实", "电影感"],
      source: "@SebJefferies",
      previewImage: "https://github.com/user-attachments/assets/3a056a8d-904e-4b3e-b0d2-b5122758b7f5",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "2000s-mirror-selfie",
      title: "2000年代复古自拍",
      titleEn: "2000s Mirror Selfie",
      description: "生成早期2000年代风格的闪光灯自拍照",
      prompt: `Create a 2000s Mirror Selfie.

{
  "subject": {
    "description": "A young woman taking a mirror selfie with very long voluminous dark waves and soft wispy bangs",
    "age": "young adult",
    "expression": "confident and slightly playful",
    "hair": {
      "color": "dark",
      "style": "very long, voluminous waves with soft wispy bangs"
    },
    "clothing": {
      "top": {
        "type": "fitted cropped t-shirt",
        "color": "cream white",
        "details": "features a large cute anime-style cat face graphic with big blue eyes, whiskers, and a small pink mouth"
      }
    },
    "face": {
      "preserve_original": true,
      "makeup": "natural glam makeup with soft pink dewy blush and glossy red pouty lips"
    }
  },
  "photography": {
    "camera_style": "early-2000s digital camera aesthetic",
    "lighting": "harsh super-flash with bright blown-out highlights but subject still visible",
    "angle": "mirror selfie",
    "shot_type": "tight selfie composition",
    "texture": "subtle grain, retro highlights, V6 realism, crisp details, soft shadows"
  },
  "background": {
    "setting": "nostalgic early-2000s bedroom",
    "wall_color": "pastel tones",
    "elements": ["chunky wooden dresser", "CD player", "posters of 2000s pop icons", "hanging beaded door curtain", "cluttered vanity with lip glosses"],
    "atmosphere": "authentic 2000s nostalgic vibe",
    "lighting": "retro"
  }
}`,
      tags: ["复古", "自拍", "2000s", "怀旧"],
      source: "@ZaraIrahh",
      previewImage: "https://github.com/user-attachments/assets/b71755dc-ff33-4872-8161-3f5066e0ccb6",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "professional-headshot",
      title: "专业商务头像",
      titleEn: "Professional Headshot Creator",
      description: "将普通照片转换为专业的商务风格头像",
      prompt: `A professional, high-resolution profile photo, maintaining the exact facial structure, identity, and key features of the person in the input image. The subject is framed from the chest up, with ample headroom. The person looks directly at the camera. They are styled for a professional photo studio shoot, wearing a premium smart casual blazer in a subtle charcoal gray. The background is a solid neutral studio color. Shot from a high angle with bright and airy soft, diffused studio lighting, gently illuminating the face and creating a subtle catchlight in the eyes, conveying a sense of clarity. Captured on an 85mm f/1.8 lens with a shallow depth of field, exquisite focus on the eyes, and beautiful, soft bokeh. Observe crisp detail on the fabric texture of the blazer, individual strands of hair, and natural, realistic skin texture. The atmosphere exudes confidence, professionalism, and approachability. Clean and bright cinematic color grading with subtle warmth and balanced tones, ensuring a polished and contemporary feel.`,
      tags: ["商务", "头像", "专业", "LinkedIn"],
      source: "@PavolRusnak",
      previewImage: "https://pbs.twimg.com/media/G6x00O_XIAASY0r?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "1990s-portrait",
      title: "90年代胶片人像",
      titleEn: "1990s Camera Style Portrait",
      description: "复制特定胶片质感、闪光摄影和时代氛围",
      prompt: `Without changing her original face, create a portrait of a beautiful young woman with porcelain-white skin, captured with a 1990s-style camera using a direct front flash. Her messy dark brown hair is tied up, posing with a calm yet playful smile. She wears a modern oversized cream sweater. The background is a dark white wall covered with aesthetic magazine posters and stickers, evoking a cozy bedroom or personal room atmosphere under dim lighting. The 35mm lens flash creates a nostalgic glow.`,
      tags: ["复古", "胶片", "90年代", "人像"],
      source: "@kingofdairyque",
      previewImage: "https://github.com/user-attachments/assets/eca5066b-1bf6-4a97-8b81-63e9e7435050",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "victorias-secret",
      title: "维密风格写真",
      titleEn: "Victoria's Secret Style Photoshoot",
      description: "创建高端奢华、后台风格的时尚摄影",
      prompt: `Create a glamorous photoshoot in the style of Victoria's Secret. A young woman attached in the uploaded reference image ( Keep the face of the person 100% accurate from the reference image ) stands almost sideways, slightly bent forward, during the final preparation for the show. Makeup artists apply lipstick to her (only her hands are visible in the frame). She is wearing a corset decorated with beaded embroidery and crystals with a short fluffy skirt, as well as large feather wings. The image has a "backstage" effect.

The background is a darkly lit room, probably under the podium. The main emphasis is on the girl's face and the details of her costume. Emphasize the expressiveness of the gaze and the luxurious look of the outfit. The photo is lit by a flash from the camera, which emphasizes the shine of the beads and crystals on the corset, as well as the girl's shiny skin. Victoria's Secret style: sensuality, luxury, glamour. Very detailed. Important: do not change the face.`,
      tags: ["时尚", "奢华", "维密", "后台"],
      source: "@NanoBanana_labs",
      previewImage: "https://github.com/user-attachments/assets/963c0a46-cf86-4604-8782-524b94afc51d",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "emotional-film",
      title: "电影感胶片摄影",
      titleEn: "Emotional Film Photography",
      description: "创建电影感的柯达Portra风格照片",
      prompt: `Keep the facial features of the person in the uploaded image exactly consistent. Style: A cinematic, emotional portrait shot on Kodak Portra 400 film. Setting: An urban street coffee shop window at Golden Hour (sunset). Warm, nostalgic lighting hitting the side of the face. Atmosphere: Apply a subtle film grain and soft focus to create a dreamy, storytelling vibe. Action: The subject is looking slightly away from the camera, holding a coffee cup, with a relaxed, candid expression. Details: High quality, depth of field, bokeh background of city lights.`,
      tags: ["电影感", "胶片", "柯达", "怀旧"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/243d1b11-9ef0-4d4f-b308-97d67b5d3bc3",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "anime-portrait-spotlight",
      title: "超写实动漫人像",
      titleEn: "Hyperrealistic Anime Portrait in Spotlight",
      description: "带有戏剧性光线的超写实动漫风格人像",
      prompt: `Generate a hyperrealistic realistic-anime portrait of a female character standing in a completely black background.
Lighting: use a **narrow beam spotlight** focused only on the center of the face.
The edges of the light must be sharp and dramatic.
All areas outside the spotlight should fall quickly into deep darkness
(high falloff shadow), almost blending into the black background.
Not soft lighting.
Hair: long dark hair with some strands falling over the face. The lower parts of the hair should fade into the shadows.
Pose: one hand raised gently to the lips in a shy, hesitant gesture.
Eyes looking directly at the camera with a mysterious mood.
Clothing: black long-sleeve knit sweater;
the sweater and body should mostly disappear into the darkness with minimal detail.
Overall tone: dark, moody, dramatic, mysterious.
High-contrast only in the lit portion of the face.
Everything outside the spotlight should be nearly invisible.`,
      tags: ["动漫", "人像", "戏剧性光线", "超写实"],
      source: "@SimplyAnnisa",
      previewImage: "https://pbs.twimg.com/media/G7Ah9SIbIAAGlyu?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "magazine-cover",
      title: "杂志封面",
      titleEn: "Magazine Cover Portrait",
      description: "创建光鲜的杂志封面",
      prompt: `A photo of a glossy magazine cover, the cover has the large bold words "Nano Banana Pro". The text is in a serif font, black on white, and fills the view. No other text.

In front of the text there is a dynamic portrait of a person in green and banana yellow colored high-end fashion.

Put the issue number and today's date in the corner along with a barcode and a price. The magazine is on a white shelf against a wall.`,
      tags: ["杂志", "封面", "时尚", "设计"],
      source: "@NanoBanana",
      previewImage: "https://pbs.twimg.com/media/G7QmCFcXoAAwaet?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "luxury-product",
      title: "奢侈品产品摄影",
      titleEn: "Luxury Product Photography",
      description: "创建漂浮的奢侈品产品照片",
      prompt: `Product:
[BRAND] [PRODUCT NAME] - [bottle shape], [label description], [liquid color]

Scene:
Luxury product shot floating on dark water with [flower type] in [colors] arranged around it.
[Lighting style - e.g., "golden hour glow" / "bright fresh light"] creates reflections and ripples across the water.

Mood & Style:
[Adjectives - e.g., "ethereal and luxurious" / "fresh and clean"], high-end commercial photography, [camera angle], shallow depth of field with soft bokeh background`,
      tags: ["产品", "奢侈品", "商业摄影", "电商"],
      source: "@AmirMushich",
      previewImage: "https://raw.githubusercontent.com/ZeroLu/awesome-nanobanana-pro/refs/heads/main/assets/luxury-product-shot.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "fisheye-movie-selfie",
      title: "鱼眼电影角色合影",
      titleEn: "Fisheye Movie Character Selfie",
      description: "与电影角色的360度鱼眼自拍",
      prompt: `A film-like fisheye wide-angle 360-degree selfie without any camera or phone visible in the subject's hands. A real and exaggerated selfie of [person from uploaded image] with [CHARACTERS]. They are making faces at the camera.

(more detailed version)
A hyper-realistic fisheye wide-angle selfie, captured with a vintage 35mm fisheye lens creating heavy barrel distortion. without any camera or phone visible in the subject's hands.
Subject & Action: A close-up, distorted group photo featuring [Person From Uploaded Image] taking selfie with [CHARACTERS]. Everyone is making wild, exaggerated faces, squinting slightly from the flash.
Lighting & Texture: Harsh, direct on-camera flash lighting that creates hard shadows behind the subjects. Authentic film grain, slight motion blur on the edges, and chromatic aberration. It looks like a candid, amateur snapshot as if captured during a chaotic behind-the-scenes moment, not a studio photo.`,
      tags: ["鱼眼", "电影", "自拍", "创意"],
      source: "@Arminn_Ai",
      previewImage: "https://pbs.twimg.com/media/G7Q6stnXIAAe7Vz?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "museum-selfie",
      title: "博物馆油画合影",
      titleEn: "Museum Art Exhibition Selfie",
      description: "在博物馆与自己的油画肖像合影",
      prompt: `A commercial grade photograph of [uploaed reference image] posing inside a high-end museum exhibition space.
[the character Source: Based strictly on the uploaded reference image.
Behind them hangs a large, ornate framed classical oil painting.

The painting depicts the same person but rendered in a rich,
traditional oil painting style with thick, visible impasto brushstrokes, deep textures, and rich color palettes on canvas.
Gallery spotlights hit the textured paint surface.
Masterpiece, ultra-detailed, cinematic lighting, strong contrast, dramatic shadows, 8K UHD, highly detailed textures
, professional photography.`,
      tags: ["博物馆", "油画", "艺术", "创意"],
      source: "@brad_zhang2024",
      previewImage: "https://pbs.twimg.com/media/G7N2KUIbMAAspf6?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "compact-camera-screen",
      title: "相机屏幕显示",
      titleEn: "Compact Camera Screen Display",
      description: "照片显示在卡片相机屏幕上的效果",
      prompt: `Use facial feature of attached photo. A close-up shot of a young woman displayed on the screen of a compact Canon digital camera. The camera body surrounds the image with its buttons, dials, and textured surface visible, including the FUNC/SET wheel, DISP button, and the "IMAGE STABILIZER" label along the side. The photo on the screen shows the woman indoors at night, illuminated by a bright built-in flash that creates sharp highlights on her face and hair. She has long dark hair falling across part of her face in loose strands, with a soft, slightly open-lip expression. The flash accentuates her features against a dim, cluttered kitchen background with appliances, shelves, and metallic surfaces softly blurred. The mood is candid, raw, nostalgic, and reminiscent of early 2000s digital camera snapshots. Colors are slightly muted with cool undertones, strong flash contrast, and natural grain from the display. No text, no logos inside the photo preview itself.

Scale ratio: 4:5 vertical

Camera: compact digital camera simulation
Lens: equivalent to 28–35mm
Aperture: f/2.8
ISO: 400
Shutter speed: 1/60 with flash
White balance: auto flash
Lighting: harsh direct flash on subject, ambient low light in the background
Color grading: nostalgic digital-camera tones, high contrast flash, subtle display grain, authentic screen glow.`,
      tags: ["相机", "屏幕", "复古", "怀旧"],
      source: "@kingofdairyque",
      previewImage: "https://pbs.twimg.com/media/G7NVohbbgAcUFBe?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "4:5" },
    },
    {
      id: "portrait-puppy-snow",
      title: "雪景小狗合影",
      titleEn: "Portrait with Puppy in Snow",
      description: "冬季雪景中与小狗的合影",
      prompt: `{
  "image_description": {
    "subject": {
      "face": {
        "preserve_original": true,
        "reference_match": true,
        "description": "The girl's facial features, expression, and identity must remain exactly the same as the reference image."
      },
      "girl": {
        "age": "young",
        "hair": "long, wavy brown hair",
        "expression": "puckering her lips toward the camera",
        "clothing": "black hooded sweatshirt"
      },
      "puppy": {
        "type": "small white puppy",
        "eyes": "light blue",
        "expression": "calm, looking forward"
      }
    },
    "environment": {
      "setting": "outdoors in a winter scene",
      "elements": [
        "snow covering the ground",
        "bare trees in the background",
        "blurred silver car behind the girl"
      ],
      "sky": "clear light blue sky"
    },
    "mood": "cute, natural, winter outdoor moment",
    "camera_style": "soft depth of field, natural daylight, subtle winter tones"
  }
}`,
      tags: ["雪景", "宠物", "冬季", "人像"],
      source: "@ZaraIrahh",
      previewImage: "https://pbs.twimg.com/media/G6qMd2abwAA-hAi?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "bathroom-mirror-selfie",
      title: "浴室镜子自拍",
      titleEn: "Bathroom Mirror Selfie",
      description: "创建特定风格和构图的镜子自拍照",
      prompt: `{
  "subject": {
    "description": "Young woman taking bathroom mirror selfie, innocent doe eyes but the outfit tells another story",
    "mirror_rules": "facing mirror, hips slightly angled, close to mirror filling frame",
    "age": "early 20s",
    "expression": {
      "eyes": "big innocent doe eyes looking up through lashes, 'who me?' energy",
      "mouth": "soft pout, lips slightly parted, maybe tiny tongue touching corner",
      "brows": "soft, slightly raised, faux innocent",
      "overall": "angel face but devil body, the contrast is the whole point"
    },
    "hair": {
      "color": "platinum blonde",
      "style": "messy bun or claw clip, loose strands framing face, effortless"
    },
    "clothing": {
      "top": {
        "type": "ULTRA mini crop tee",
        "color": "yellow",
        "graphic": "single BANANA logo/graphic",
        "fit": "barely containing chest, fabric stretched tight, ends just below, shows full stomach"
      },
      "bottom": {
        "type": "tight tennis skort or athletic booty shorts",
        "color": "white",
        "material": "thin stretchy athletic fabric",
        "fit": "vacuum tight, riding up, clinging, fabric creases visible"
      }
    },
    "face": {
      "features": "pretty - big eyes, small nose, full lips",
      "makeup": "minimal, natural, lip gloss, no-makeup makeup"
    }
  },
  "accessories": {
    "headwear": {
      "type": "Goorin Bros cap",
      "details": "black with animal patch, worn backwards or tilted"
    },
    "headphones": {
      "type": "over-ear white headphones",
      "position": "around neck"
    },
    "device": {
      "type": "iPhone",
      "details": "visible in mirror, held at chest level"
    }
  },
  "photography": {
    "camera_style": "casual iPhone mirror selfie, NOT professional",
    "quality": "iPhone camera - good but not studio, realistic social media quality",
    "angle": "eye-level, straight on mirror",
    "shot_type": "3/4 body, close to mirror",
    "aspect_ratio": "9:16 vertical",
    "texture": "natural, slightly grainy iPhone look, not over-processed"
  },
  "background": {
    "setting": "regular apartment bathroom",
    "style": "normal NYC apartment bathroom, not luxury",
    "elements": ["white subway tile walls", "basic bathroom mirror with good lighting above", "simple white sink vanity", "toiletries visible", "towel hanging on hook", "maybe shower curtain edge visible", "small plant on counter"],
    "atmosphere": "real bathroom, lived-in, normal home",
    "lighting": "good vanity lighting above mirror - bright, even, flattering but not studio"
  }
}`,
      tags: ["自拍", "镜子", "浴室", "社交媒体"],
      source: "@gaucheai",
      previewImage: "https://pbs.twimg.com/media/G7PebGOW8AALh2P?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "character-selfie",
      title: "电影角色合影",
      titleEn: "Character Consistency Selfie with Movie Character",
      description: "与电影角色自拍同时保持面部一致性",
      prompt: `I'm taking a selfie with [movie character] on the set of [movie name].

Keep the person exactly as shown in the reference image with 100% identical facial features, bone structure, skin tone, facial expression, pose, and appearance. 1:1 aspect ratio, 4K detail.`,
      tags: ["电影", "自拍", "角色", "合影"],
      source: "@rohanpaul_ai",
      previewImage: "https://pbs.twimg.com/media/G7HwgjGaYAAgJ67?format=jpg&name=small",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "canon-ixus-portrait",
      title: "佳能IXUS美学人像",
      titleEn: "Canon IXUS Aesthetic Portrait",
      description: "创建佳能IXUS卡片相机风格的人像照片",
      prompt: `{
  "image_parameters": {
    "style": "Canon IXUS aesthetic",
    "type": "Point-and-shoot photography",
    "quality": "Hyper-realistic",
    "tone": "Sharp, direct",
    "lighting_and_atmosphere": "Realistic, flash-style/direct lighting"
  },
  "subject": {
    "constraints": {
      "facial_identity": "Match reference image exactly 100%",
      "face_edits": "None allowed"
    },
    "hair": {
      "style": "Long, natural, lightly messy layered look",
      "movement": "Blowing gently in the wind",
      "details": "Strands slightly covering part of face"
    },
    "makeup": {
      "cheeks_and_nose": "Soft pink blush with blurred effect",
      "lips": "Subtle pink-orange tinted outline"
    },
    "expression": ["Cute", "Naive", "Cheerful", "Slightly sexy/undone charm"],
    "pose": {
      "body_position": "Half-sitting, half-standing",
      "action": "Flicking hair"
    },
    "clothing": {
      "top": "Black strapless top",
      "bottom": "Low-waisted jeans with a floating waistline",
      "neck": "Thin black fabric choker/wrap"
    },
    "accessories": ["Small pendant necklace", "Gold watch"]
  },
  "environment": {
    "setting": "Modern pub",
    "foreground_props": ["Round table", "Bottle of liquor", "Glass of liquor"]
  }
}`,
      tags: ["IXUS", "卡片相机", "复古", "人像"],
      source: "@lexx_aura",
      previewImage: "https://pbs.twimg.com/media/G7U1z0CbQAE9zEq?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "fisheye-matcha",
      title: "鱼眼抹茶女孩",
      titleEn: "Fisheye Matcha Girl",
      description: "超广角鱼眼镜头拍摄的喝抹茶饮料的女孩",
      prompt: `{
  "scene": {
    "environment": "sunny_boardwalk",
    "details": "wooden_planks, colorful_stalls, people_walking, distant_umbrellas",
    "lighting": "bright_midday_sun",
    "sky": "clear_blue"
  },
  "camera": {
    "lens": "ultra_wide_fisheye_12mm",
    "distance": "very_close_up",
    "distortion": "strong_exaggeration",
    "angle": "slightly_low_upward"
  },
  "subject": {
    "type": "young_person",
    "gender": "neutral",
    "expression": "curious_playful",
    "eyes": "large_due_to_lens_distortion",
    "pose": "leaning_forward_sipping_drink",
    "clothing": {
      "top": "bright_green_knit_sweater",
      "accessory": "chunky_blue_sunglasses"
    }
  },
  "drink": {
    "type": "iced_matcha_latte",
    "ice_cubes": "large_clear",
    "cup": "transparent_plastic",
    "straw": "green_white_spiral"
  },
  "effects": {
    "depth_of_field": "shallow_foreground_sharp_background_soft",
    "reflections": "glasses_show_boardwalk_and_people",
    "color_grade": "clean_natural"
  },
  "composition": {
    "focus": "face_extreme_closeup",
    "mood": "funny_intimate_casual",
    "background_elements": ["distant_people", "benches", "bright_shops"]
  }
}`,
      tags: ["鱼眼", "抹茶", "广角", "人像"],
      source: "@egeberkina",
      previewImage: "https://pbs.twimg.com/media/G6_pAefWYAAilqz?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "business-portrait",
      title: "商务照",
      titleEn: "Business Portrait",
      description: "将普通照片转换为专业商务人像",
      prompt: `保持上传图片中人物的面部特征完全一致。
为他们穿上一套专业的海军蓝商务西装和白衬衫,类似于参考图片。
背景:将主体置于一个干净、纯色的深灰色影棚摄影背景前。背景应有微妙的渐变,主体后面稍亮,边缘处较暗(暗角效果)。不应有其他物体。
摄影风格:使用索尼A7III相机和85mm f/1.4镜头拍摄,营造出优美的人像压缩效果。
灯光:使用经典的三点式布光。主光应在脸上形成柔和、轮廓分明的阴影。一个微妙的轮廓光应将主体的肩膀和头发与深色背景分离开来。
关键细节:渲染出带有可见毛孔的自然皮肤纹理,而不是过度磨皮的效果。为眼睛添加自然的眼神光。西装的面料应显示出微妙的羊毛质感。
最终图像应为一张超逼真的8k专业头像照。`,
      tags: ["商务", "职业", "专业", "证件照"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/business_portrait.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "1990s-polaroid-party",
      title: "90年代宝丽来派对",
      titleEn: "1990s Polaroid Party Atmosphere",
      description: "复刻90年代末宝丽来派对氛围感照片",
      prompt: `1:1 宽高比,一张90年代末的宝丽来照片。上传图片的人物出现在照片中,被捕捉到一个随意、不完美的瞬间。背景是一个脏乱的房屋地下室,身后有人在开派对。照片具有低光宝丽来摄影的真实外观,带有动态模糊、刺眼的闪光灯、颗粒感和真实派对快照中典型的不佳构图。`,
      tags: ["宝丽来", "派对", "90年代", "复古"],
      source: "@Arminn_Ai",
      previewImage: "https://pbs.twimg.com/media/G5o8EfRXQAAxv0R?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "self-portrait-painting",
      title: "画家自画像",
      titleEn: "Artist Self-Portrait",
      description: "艺术家正在画自己逼真的自画像",
      prompt: `一张专业的、电影般的照片(不是数字艺术或绘画),捕捉到一位艺术家,她/他具有与上传的参考照片相同的面部特征,这位艺术家正在画架上画她/他逼真的自画像。她/他手持一支精细的画笔靠近脸颊,站在画架前。`,
      tags: ["艺术家", "自画像", "创意", "绘画"],
      source: "@ZaraIrahh",
      previewImage: "https://pbs.twimg.com/media/G5i9ovQa8AAPk3A?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "kodak-film-portrait",
      title: "柯达胶片写真",
      titleEn: "Kodak Film Portrait",
      description: "创建柯达Portra 400胶片风格的情绪化人像",
      prompt: `保持上传图片中人物的面部特征完全一致。
风格:一张使用柯达Portra 400胶片拍摄的电影感、情绪化人像。
场景:黄金时段(日落时分)的城市街边咖啡馆窗边。温暖、怀旧的光线打在脸的一侧。
氛围:应用微妙的胶片颗粒和柔焦,营造出梦幻、有故事感的氛围。
动作:主体略微移开视线,不看镜头,手持咖啡杯,表情轻松、自然。
细节:高画质,有景深,背景是散景的城市灯光。`,
      tags: ["柯达", "胶片", "咖啡馆", "情绪"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/film_portrait.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "vintage-nokia-phone",
      title: "复古诺基亚手机Y2K风格",
      titleEn: "Vintage Nokia Phone Y2K Style",
      description: "照片显示在复古诺基亚手机屏幕上,千禧年Y2K风格",
      prompt: `这是一张抓拍的、略微倾斜的复古诺基亚手机特写(经典直板造型,例如 6610 或类似的早期彩屏机型),手机在画面中随意地呈对角线放置。低分辨率的发光 LCD 屏幕占据了构图的主导地位,填满了大部分视野。周围坚固的塑料外壳和物理 T9 键盘/导航键的顶部区域仅部分可见,并在画面边缘被裁剪掉。

屏幕内容:像素化的屏幕上显示着一个实时的"相机预览"界面:

照片内容:附带照片中的人物经过转换,身穿明显的千禧年 Y2K 流行时装(例如闪亮的金属面料、天鹅绒运动装、水钻细节或层叠网眼织物)。整个场景呈现出浓重的早期拍照手机美学:明显的像素网格(纱窗效应)、有限且略微褪色的调色板,以及块状的压缩伪影。

复古 UI 叠加:覆盖在照片视图之上的是低像素、单色的诺基亚用户界面元素。

屏幕顶部边缘:像素化的信号强度条(左)、"Camera"文字(中)、块状电池图标(右)。

屏幕底部角落:块状像素字体的软键(Soft-key)标签,左侧显示"Options"(选项),右侧显示"Back"(返回)。

氛围与光影:屏幕发出特有的绿蓝色 LCD 背光色调,微弱的光线投射在周围的塑料边框上。整体氛围怀旧、具有互动感,且呈现出真实的低保真(Lo-fi)科技感。

参数设置:
比例:4:5 竖幅
相机视角:复古手机屏幕微距特写,手持视角
屏幕模拟:早期 CSTN 或 TFT LCD 屏幕,可见像素颗粒,特有的绿色色偏
UI 元素:复古低分辨率单色像素图标和块状文字覆盖
内容变换:将人物服装替换为 Y2K 千禧年流行风格
调色风格:低饱和度冷色调,数字噪点,颜色抖动伪影,屏幕荧光`,
      tags: ["诺基亚", "Y2K", "千禧年", "复古"],
      source: "@op7418",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/vintage_nokia_phone.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "4:5" },
    },
    {
      id: "toriyama-style",
      title: "鸟山明风格",
      titleEn: "Toriyama Akira Style",
      description: "转换为鸟山明漫画风格",
      prompt: `转成鸟山明风格`,
      tags: ["鸟山明", "龙珠", "漫画", "风格转换"],
      source: "Official",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/toriyama.jpeg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "anime-fisheye-selfie",
      title: "与动漫角色鱼眼自拍",
      titleEn: "Anime Character Fisheye Selfie",
      description: "与动漫角色的超广角鱼眼自拍照",
      prompt: `9/16 垂直格式鱼眼自拍,上传照片人物与[Doraemon, Naruto, Nobita, Satoru Gojo, Sung Jin, who is Ash from Pokémon]合照自拍。都以傻傻的、夸张的表情微笑。设置在一个小而明亮的客厅中,白调。高相机角度。极端鱼眼扭曲。现实的、电影照明将动漫角色与风格化现实整合。`,
      tags: ["鱼眼", "动漫", "自拍", "创意"],
      source: "@MehdiSharifi",
      previewImage: "https://pbs.twimg.com/media/G6Nw8foXoAAiqOo.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "fashion-portrait-collage",
      title: "时尚人像拼贴大片",
      titleEn: "Fashion Portrait Collage",
      description: "创作独特的时尚人像拼贴大片",
      prompt: `一、总体目标
1 功能描述:根据用户上传的人物参考图,提取人物气质、妆容风格、光线和色彩特征,创作一张独一无二的时尚人像拼贴大片。
2 差异要求:保留参考人物的五官结构与整体气质,不直接临摹原图,妆容和构图在同一风格体系中做创意变化。

二、输入参考图要求
1 参考内容:清晰的正脸或三分之二侧脸人物照片,可看清五官、肤质与大致光线氛围。
2 提取要点:从参考图中读取肤色、妆容浓淡、主色调、光线方向、人物气质和服饰配色。

三、画面构图与输出形式
1 主画面:生成人物面部超近景或近景,头部和肩部占据画面大部分空间,视线可以参考原图气质设计。
2 拼贴结构:右侧或一角增加多张小图拼贴,可包含侧脸特写、手部特写、局部妆容特写等,形成杂志排版感。
3 背景方式:保持背景简洁干净,以纯色或轻微明度过渡为主,突出人物与妆容。

四、文字与图形设计
1 标题文字:画面上方放置大号杂志标题,字形简洁有力量,保持居中或上中对齐
2 副标题与小字:在画面一侧或底部添加几行小字,内容可以是主题词、人物名、日期,排列整齐,字号统一
3 几何图形:在人物周围加入细线条、窄矩形色块或半透明色块,与文字结合使用,增加平面构成感

五、风格继承规则
1 色彩继承:整体色调、明暗对比、冷暖气质尽量贴合参考图风格,主色来自参考图中最显眼的妆容或服饰颜色。
2 光线继承:参考原图光线方向和柔和程度,若原图是柔光则保持柔光质感,若原图对比度较强则保留一定硬朗感。
3 妆容继承:根据参考图的妆容特点(清透、浓烈、实验性、自然等)保持同一风格等级,再在眼妆、腮红、唇妆中做细节变化。
4 氛围继承:延续参考图的情绪氛围,例如冷淡感、甜美感、叛逆感、神秘感等,在表情与姿态上呼应。

六、创意变化规则
1 妆容变化:在参考风格基础上增加局部夸张处理,例如扩大腮红范围、强化唇部晕染、增加雀斑或高光点。
2 构图变化:可以调整脸部角度、裁切范围和小图拼贴位置,让每次生成都具有不同构图。
3 配饰变化:在颈部、耳部或手部加入简洁有设计感的饰品,与主色调呼应但不完全复制参考图。
4 细节手势:增加触碰嘴唇、脸颊、眼下等手部动作,使画面更具故事感和参与感。

七、整体质感与后期风格
1 清晰度:保持皮肤毛孔和细节可见,避免过度磨皮,但适当柔化非焦点区域。
2 色调处理:整体色调统一,适度降低杂乱颜色,只强化主色和少数点缀色。
3 情绪表现:根据参考图的气质,控制表情和眼神的强度,让画面既保留原本风格,又有独立个性。

参考用户上传的人物照片,按以上规则自动读取图像风格并进行创作。`,
      tags: ["时尚", "拼贴", "杂志", "创意"],
      source: "@qisi_ai",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/fashion_portrait_collage.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "1990s-camera-portrait",
      title: "1990年代相机肖像",
      titleEn: "1990s Camera Portrait",
      description: "1990年代风格相机拍摄的肖像转换",
      prompt: `不改变她原来的脸,创建一个美丽的年轻女性的肖像,具有瓷白皮肤,用1990s风格的相机捕捉,使用直接前闪光。她凌乱的深棕色头发扎起来,摆出平静却调皮的微笑。她穿着现代的超大奶油色毛衣。背景是深白色的墙壁,覆盖着美学杂志海报和贴纸,唤起昏暗照明下舒适的卧室或个人房间氛围。`,
      tags: ["90年代", "相机", "复古", "卧室"],
      source: "@ZaraIrahh",
      previewImage: "https://pbs.twimg.com/media/G4JuPtGWQAACxHr.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
  ],
};
