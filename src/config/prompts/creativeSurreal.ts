import type { PromptCategory } from "../promptConfig";

// 超现实与概念艺术类提示词
export const creativeSurrealCategory: PromptCategory = {
  id: "creativeSurreal",
  name: "超现实艺术",
  nameEn: "Surreal & Conceptual Art",
  icon: "Sparkle",
  description: "超现实主义、特殊视觉效果、跨维度概念艺术",
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
    {
      id: "liquid-gold-dress",
      title: "液体黄金裙摆",
      titleEn: "Liquid Gold Dress",
      description: "高速摄影捕捉液体金色形成的裙摆",
      prompt: `A high-speed photograph of a dancer where her dress is formed entirely by splashing liquid gold. The liquid freezes in mid-air, creating intricate swirls and droplets that mimic fabric. Cinematic lighting, golden hour colors, luxurious and dynamic.`,
      tags: ["舞者", "液体", "黄金", "高速摄影"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6QsE-EacAIEfdJ.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "yin-yang-koi",
      title: "锦鲤太极图",
      titleEn: "Yin Yang Koi Fish",
      description: "两条锦鲤形成的太极图案",
      prompt: `两条锦鲤在水中游动,形成完美的阴阳太极图案。一条鱼由黑色的水墨烟雾组成,另一条由白色的发光光线组成。俯视视角,水面有涟漪。禅意,极简主义。`,
      tags: ["锦鲤", "太极", "水墨", "禅意"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6QuUsWacAArtgo.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "whale-in-clouds",
      title: "云海中的水鲸鱼",
      titleEn: "Water Whale in Clouds",
      description: "半透明水做的蓝鲸在云海中游动",
      prompt: `黄金时刻,一只巨大的、半透明的蓝鲸在洁白蓬松的云海中游动。鲸鱼的身体由海水构成,里面还可以看到游动的鱼群。阳光穿透水做的鲸鱼,折射出彩虹。画面超现实且宏伟壮观。`,
      tags: ["鲸鱼", "云海", "超现实", "彩虹"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6QvTkCacAATNjA.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "watermelon-pool",
      title: "西瓜游泳池",
      titleEn: "Watermelon Swimming Pool",
      description: "巨大西瓜变成游泳池的微缩场景",
      prompt: `一个巨大西瓜的剖面图。红色的果肉实际上是一个装满红色水的游泳池。黑色的西瓜籽是游泳圈。微缩的小人在西瓜皮上游泳和晒太阳。夏日氛围。`,
      tags: ["西瓜", "游泳池", "微缩", "夏日"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6QxDHEacAIO_xc.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
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
  ],
};
