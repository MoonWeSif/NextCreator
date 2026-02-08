import type { PromptCategory } from "../promptConfig";

// 电商摄影类提示词
export const ecommerceCategory: PromptCategory = {
  id: "ecommerce",
  name: "电商摄影",
  nameEn: "E-commerce & Virtual Studio",
  icon: "ShoppingBag",
  description: "虚拟模特试穿、产品摄影和商业展示",
  prompts: [
    {
      id: "virtual-tryon",
      title: "虚拟模特试穿",
      titleEn: "Virtual Model Try-On",
      description: "让模特穿上特定服装,保留面料纹理和光线融合",
      prompt: `Using Image 1 (the garment) and Image 2 (the model), create a hyper-realistic full-body fashion photo where the model is wearing the garment. Crucial Fit Details: The [T-shirt/Jacket] must drape naturally on the model's body, conforming to their posture and creating realistic folds and wrinkles. High-Fidelity Preservation: Preserve the original fabric texture, color, and any logos from Image 1 with extreme accuracy. Seamless Integration: Blend the garment into Image 2 by perfectly matching the ambient lighting, color temperature, and shadow direction. Photography Style: Clean e-commerce lookbook, shot on a Canon EOS R5 with a 50mm f/1.8 lens for a natural, professional look.`,
      tags: ["试穿", "电商", "服装", "模特"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/81eaafb6-901b-424d-a197-dc1bc0bfc5bf",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "product-photography",
      title: "专业产品摄影",
      titleEn: "Professional Product Photography",
      description: "将产品从杂乱背景中隔离,放置在高端商业摄影棚设置中",
      prompt: `Identify the main product in the uploaded photo (automatically removing any hands holding it or messy background details). Recreate it as a premium e-commerce product shot. Subject Isolation: Cleanly extract the product, completely removing any fingers, hands, or clutter. Background: Place the product on a pure white studio background (RGB 255, 255, 255) with a subtle, natural contact shadow at the base to ground it. Lighting: Use soft, commercial studio lighting to highlight the product's texture and material. Ensure even illumination with no harsh glare. Retouching: Automatically fix any lens distortion, improve sharpness, and color-correct to make the product look brand new and professional.`,
      tags: ["产品摄影", "电商", "白底", "商业"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/cdfd4934-d06a-48ee-bf28-58ce16c458c1",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "chibi-brand-store",
      title: "Q版品牌小店",
      titleEn: "3D Chibi-Style Miniature Brand Store",
      description: "为品牌创建迷你3D小店",
      prompt: `3D chibi-style miniature concept store of {Brand Name}, creatively designed with an exterior inspired by the brand's most iconic product or packaging (such as a giant {brand's core product, e.g., chicken bucket/hamburger/donut/roast duck}). The store features two floors with large glass windows clearly showcasing the cozy and finely decorated interior: {brand's primary color}-themed decor, warm lighting, and busy staff dressed in outfits matching the brand. Adorable tiny figures stroll or sit along the street, surrounded by benches, street lamps, and potted plants, creating a charming urban scene. Rendered in a miniature cityscape style using Cinema 4D, with a blind-box toy aesthetic, rich in details and realism, and bathed in soft lighting that evokes a relaxing afternoon atmosphere. --ar 2:3`,
      tags: ["3D", "品牌", "Q版", "盲盒风格"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G7BWvI8X0AApeZB?format=jpg&name=900x900",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "2:3" },
    },
    {
      id: "room-furnishing",
      title: "房间家具可视化",
      titleEn: "Room Furnishing Visualization",
      description: "可视化空房间配置家具后的效果",
      prompt: `Show me how this room would look with furniture in it`,
      tags: ["室内设计", "家具", "可视化", "房间"],
      source: "@NanoBanana",
      previewImage: "https://pbs.twimg.com/media/G63UHDYWoAAD_Hm?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "ecommerce-model-tryon",
      title: "电商模特试穿",
      titleEn: "E-commerce Model Try-On",
      description: "将服装合成到模特身上用于电商展示",
      prompt: `使用图1(服装)和图2(模特),创建一张超现实的全身时尚照片,让模特穿着这件服装。
关键合身细节:[T恤/夹克]必须自然地垂在模特身上,贴合其姿势并产生逼真的褶皱。
高保真保留:极其精确地保留图1中的原始面料质感、颜色和任何标志。
无缝融合:通过完美匹配环境光、色温和阴影方向,将服装融入图2中。
摄影风格:干净的电商产品画册(Lookbook)风格,使用佳能EOS R5相机和50mm f/1.8镜头拍摄,呈现自然、专业的外观。`,
      tags: ["电商", "模特", "试穿", "服装"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/ecommerce_model.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "pro-product-photography",
      title: "专业电商商品图",
      titleEn: "Professional Product Photography",
      description: "将产品转换为高端电商产品图",
      prompt: `识别上传照片中的主要产品(自动移除任何手持它的手或杂乱的背景细节),并将其重新创建为一张高端电商产品图。
主体分离:干净地提取产品,完全移除任何手指、手或杂物。
背景:将产品放置在纯白色的影棚背景(RGB 255, 255, 255)上,底部带有微妙、自然的接触阴影,使其看起来稳固。
灯光:使用柔和的商业影棚灯光来凸显产品的质感和材质。确保光照均匀,没有刺眼的强光。
修图:自动修复任何镜头畸变,提高清晰度,并进行色彩校正,使产品看起来崭新且专业。`,
      tags: ["产品", "电商", "摄影", "白底"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/product_photography.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
  ],
};
