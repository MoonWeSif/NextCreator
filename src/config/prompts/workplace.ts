import type { PromptCategory } from "../promptConfig";

// 工作效率类提示词
export const workplaceCategory: PromptCategory = {
  id: "workplace",
  name: "工作效率",
  nameEn: "Workplace & Productivity",
  icon: "Briefcase",
  description: "将白板草图转换为专业图表和UI原型",
  prompts: [
    {
      id: "flowchart-conversion",
      title: "手绘流程图转换",
      titleEn: "Hand-drawn Flowchart to Corporate Charts",
      description: "将白板草图转换为清晰的麦肯锡风格矢量图",
      prompt: `Convert this hand-drawn whiteboard sketch into a professional corporate flowchart suitable for a business presentation. Style Guide: Use a minimalist 'McKinsey-style' aesthetic: clean lines, ample whitespace, and a sophisticated blue-and-gray color palette. Structure: Automatically align all boxes and diamonds to a strict grid. Connect them with straight, orthogonal arrows (90-degree angles only, no curvy lines). Text: Transcribe the handwritten labels into a clear, bold Sans-Serif font (like Arial or Roboto). Output: High-resolution vector-style image on a pure white background.`,
      tags: ["流程图", "商务", "麦肯锡", "图表"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/c59d3272-7525-4be0-94e3-8d642baaa659",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "ui-prototype",
      title: "UI草图转高保真原型",
      titleEn: "UI Hand-drawn Sketch to High-Fidelity Prototype",
      description: "将线框草图转换为真实的移动应用原型",
      prompt: `Transform this rough wireframe sketch into a high-fidelity UI design mockups for a mobile app. Design System: Apply a modern, clean aesthetics similar to iOS 18 or Material Design 3. Use rounded corners, soft drop shadows, and a vibrant primary color. Components: Intelligently interpret the sketch: turn scribbles into high-quality placeholder images, convert rough rectangles into proper buttons with gradients, and turn lines into realistic text blocks. Layout: Ensure perfect padding and consistent spacing between elements. Context: Place the design inside a realistic iPhone 16 frame mockups.`,
      tags: ["UI", "原型", "移动应用", "设计"],
      source: "WeChat Article",
      previewImage: "https://github.com/user-attachments/assets/67690896-22f8-4abc-8e89-d4779233a7ad",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "magazine-layout",
      title: "杂志排版生成",
      titleEn: "Magazine Layout Generator",
      description: "将文章可视化为带有复杂排版的印刷格式",
      prompt: `Put this whole text, verbatim, into a photo of a glossy magazine article on a desk, with photos, beautiful typography design, pull quotes and brave formatting. The text: [...the unformatted article]`,
      tags: ["杂志", "排版", "设计", "文章"],
      source: "@fofrAI",
      previewImage: "https://github.com/user-attachments/assets/5982a68e-8c7d-4c7c-a07e-2a4a0a74770d",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "gradient-glass-ppt",
      title: "渐变玻璃风格PPT",
      titleEn: "Gradient Glass Style PPT",
      description: "生成高端科技感的渐变玻璃风格PPT",
      prompt: `你是一位专家级UI UX演示设计师,请生成高保真、未来科技感的16比9演示文稿幻灯片。请根据视觉平衡美学,自动在封面、网格布局或数据可视化中选择一种最完美的构图。

全局视觉语言方面,风格要无缝融合Apple Keynote的极简主义、现代SaaS产品设计和玻璃拟态风格。整体氛围需要高端、沉浸、洁净且有呼吸感。光照采用电影级体积光、柔和的光线追踪反射和环境光遮蔽。配色方案选择深邃的虚空黑或纯净的陶瓷白作为基底,并以流动的极光渐变色即霓虹紫、电光蓝、柔和珊瑚橙、青色作为背景和UI高光点缀。

关于画面内容模块,请智能整合以下元素:
1. 排版引擎采用Bento便当盒网格系统,将内容组织在模块化的圆角矩形容器中。容器材质必须是带有模糊效果的磨砂玻璃,具有精致的白色边缘和柔和的投影,并强制保留巨大的内部留白,避免拥挤。
2. 插入礼物质感的3D物体,渲染独特的高端抽象3D制品作为视觉锚点。它们的外观应像实体的昂贵礼物或收藏品,材质为抛光金属、幻彩亚克力、透明玻璃或软硅胶,形状可是悬浮胶囊、球体、盾牌、莫比乌斯环或流体波浪。
3. 字体与数据方面,使用干净的无衬线字体,建立高对比度。如果有图表,请使用发光的3D甜甜圈图、胶囊状进度条或悬浮数字,图表应看起来像发光的霓虹灯玩具。

构图逻辑参考:
如果生成封面,请在中心放置一个巨大的复杂3D玻璃物体,并覆盖粗体大字,背景有延伸的极光波浪。
如果生成内容页,请使用Bento网格布局,将3D图标放在小卡片中,文本放在大卡片中。
如果生成数据页,请使用分屏设计,左侧排版文字,右侧悬浮巨大的发光3D数据可视化图表。

渲染质量要求:虚幻引擎5渲染,8k分辨率,超细节纹理,UI设计感,UX界面,Dribbble热门趋势,设计奖获奖作品。`,
      tags: ["PPT", "演示", "玻璃拟态", "科技"],
      source: "@op7418",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/nano_banana_pro_ppt.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "allergy-warning-card",
      title: "餐饮过敏警示卡",
      titleEn: "Allergy Warning Card",
      description: "设计餐饮过敏警告图形卡片",
      prompt: `设计一个扁平的2D数字警告图形(全屏图像,没有手,没有手机框,没有背景风景)。
构图:
1. 中心视觉:一个逼真的[花生]图标,上面覆盖着一个巨大、粗体的红色禁止标志(🚫)。
2. 文字:
- 顶部(红色,粗体):'WARNING!'(警告!)
- 中间(泰语):'ฉันแพ้ถั่วลิสง' (我对花生过敏)
- 底部(英语):'NO PEANUTS! Serious Health Risk.'(不要花生!有严重健康风险。)
风格:简洁的矢量艺术风格,纯白色背景,高对比度。让它看起来像一个数字标牌。`,
      tags: ["过敏", "警示", "餐饮", "旅行"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/allergy_card.png",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "9:16" },
    },
    {
      id: "sketch-to-flowchart-pro",
      title: "手绘草图转流程图",
      titleEn: "Sketch to Professional Flowchart",
      description: "将手绘白板草图转换为专业流程图",
      prompt: `将这张手绘的白板草图转换为适用于商务演示的专业公司流程图。
风格指南:使用极简的麦肯锡风格美学:简洁的线条、充足的留白空间,以及精致的蓝灰色调。
结构:自动将所有方框和菱形对齐到严格的网格上。用笔直的正交箭头(仅90度角,无线条)连接它们。
文字:将手写的标签转录为清晰、粗体的无衬线字体(如Arial或Roboto)。
输出:纯白色背景上的高分辨率矢量风格图像。`,
      tags: ["流程图", "草图", "转换", "商务"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/sketch_to_flowchart.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "ui-mockup-pro",
      title: "UI原型转高保真",
      titleEn: "UI Mockup to Hi-Fi Prototype",
      description: "UI手绘稿转高保真原型",
      prompt: `将这个粗糙的线框草图转换为一个移动应用的高保真UI设计模型。
设计系统:应用类似于iOS 18或Material Design 3的现代、简洁美学。使用圆角、柔和的投影和鲜艳的主色调。
组件:智能地解读草图:将涂鸦变成高质量的占位图,将粗糙的矩形转换为带有渐变的正式按钮,并将线条变成逼真的文本块。
布局:确保元素之间有完美的内边距和一致的间距。
情境:将设计放入一个逼真的iPhone 16模型框架中。`,
      tags: ["UI", "原型", "高保真", "移动应用"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/ui_mockup.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "light-puppet-reference",
      title: "光影人偶打光参考",
      titleEn: "Light Puppet Reference",
      description: "使用光影人偶作为打光参考",
      prompt: `使用光影人偶作为打光参考,将图一人物变成图二光影,深色为暗`,
      tags: ["光影", "打光", "参考", "摄影"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://pbs.twimg.com/media/Gzmjo-casAAPwcl.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "expression-reference",
      title: "表情准确参考转换",
      titleEn: "Expression Reference Transfer",
      description: "将图一人物换成图二的表情",
      prompt: `图一人物参考/换成图二人物的表情`,
      tags: ["表情", "转换", "参考", "编辑"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://pbs.twimg.com/media/Gz6ITgYaQAE8jcH.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "pose-reference-transfer",
      title: "人物姿势参考替换",
      titleEn: "Pose Reference Transfer",
      description: "图一人物换成图二姿势",
      prompt: `图一人物换成图二姿势,专业摄影棚拍摄`,
      tags: ["姿势", "参考", "替换", "摄影"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://pbs.twimg.com/media/GzbyOavbQAAMvH0.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "package-mockup",
      title: "包装贴合效果",
      titleEn: "Package Mockup Effect",
      description: "将设计贴在产品包装上",
      prompt: `把图一贴在图二易拉罐上,并放在极简设计的布景中,专业摄影`,
      tags: ["包装", "易拉罐", "贴合", "产品"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://pbs.twimg.com/media/Gzxe5nxbkAAx2rU.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "text-to-diagram",
      title: "文本转图示",
      titleEn: "Text to Diagram",
      description: "将指示文本转换为图示",
      prompt: `将此指示图转换为图示。`,
      tags: ["图示", "文本", "转换", "可视化"],
      source: "@nobisiro_2023",
      previewImage: "https://pbs.twimg.com/media/G1IktD0bgAAP8kW.png?format=png&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "neogradient-logo",
      title: "NeoGradient标志设计",
      titleEn: "NeoGradient Logo Design",
      description: "为初创公司设计现代渐变标志",
      prompt: `为虚构初创公司"名称"在"[行业类型]"行业设计现代标志,NeoGradient Soft Tech风格。

标志必须包括:
•独特抽象图标
•干净、大胆无衬线字体
•平滑发光渐变混合生动颜色如蓝、紫、粉、橙和蓝绿
•符号和文本无缝和谐
•极简主义、未来主义构图
•纯黑背景
•1:1宽高比——超高清

标志应感觉创意、现代且准备好大胆数字品牌。`,
      tags: ["标志", "Logo", "渐变", "初创"],
      source: "@aziz4ai",
      previewImage: "https://pbs.twimg.com/media/GuCyhxeXwAANI0i.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "high-end-product-photo",
      title: "高端编辑产品摄影",
      titleEn: "High-End Editorial Product Photo",
      description: "创建奢华风格的产品摄影",
      prompt: `一张高端编辑照片,[产品名称或图像]放置在白色大理石基座上,休息在香槟色丝绸上。它被柔和花朵包围,花朵类型和颜色自然与产品主要颜色[颜色调色板]和谐——补充并增强其色调。柔和自然光从左上。3D现实主义,奢侈产品摄影,浅景深,1:1格式。`,
      tags: ["产品", "摄影", "奢侈", "编辑"],
      source: "@Kerroudjm",
      previewImage: "https://pbs.twimg.com/media/Gv0SL0LWMAAvaji.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "xiaohongshu-cover",
      title: "小红书封面设计",
      titleEn: "Xiaohongshu Cover Design",
      description: "生成吸引人的小红书封面",
      prompt: `画图:画一个小红书封面。
要求:
有足够的吸引力吸引用户点击;
字体醒目,选择有个性的字体;
文字大小按重要度分级,体现文案的逻辑结构;
标题是普通文字的至少2倍;
文字段落之间留白。
只对要强调的文字用醒目色吸引用户注意;
背景使用吸引眼球的图案(包括不限于纸张,记事本,微信聊天窗口,选择一种)
使用合适的图标或图片增加视觉层次,但要减少干扰。

文案:重磅!ChatGPT又变强了!
多任务处理更牛✨
编程能力更强💪
创造力爆表🎨
快来试试!

图像9:16比例`,
      tags: ["小红书", "封面", "设计", "社交"],
      source: "@balconychy",
      previewImage: "https://camo.githubusercontent.com/45b01396b09d1b97bab11b9d4b2c4e332c99365f452fef25d4b10c2fb706f5e9/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d72657472792d4a726f686e4e795552354e31496e4c525a36692d2d2e706e673f763d31",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "9:16" },
    },
    {
      id: "app-prototype",
      title: "产品原型图",
      titleEn: "App Prototype Design",
      description: "开发APP的原型图设计",
      prompt: `我想开发一款类似于"小宇宙"的APP,请你帮我画个原型图,所有要求均符合APP原型图标准。`,
      tags: ["APP", "原型图", "产品", "设计"],
      source: "@canghecode",
      previewImage: "https://pbs.twimg.com/media/G6Oknc3acAMcKhO.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "ppt-design",
      title: "PPT页面设计",
      titleEn: "PPT Page Design",
      description: "设计单页PPT内容",
      prompt: `我想做一页PPT
关于AI Agent的应用场景,你自行帮我设计一下,要求科技主题的。文字为中文`,
      tags: ["PPT", "设计", "科技", "演示"],
      source: "@canghecode",
      previewImage: "https://pbs.twimg.com/media/G6OlmebacAAZZz4.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "event-poster",
      title: "活动海报设计",
      titleEn: "Event Poster Design",
      description: "为活动创建宣传海报",
      prompt: `我要举办一场活动
主题为"AI赋能发明创新",时间为2025年11月20日上午10点,地点在北京体育中心,请帮我画一张宣传海报,要求有科技感。`,
      tags: ["海报", "活动", "宣传", "科技"],
      source: "@canghecode",
      previewImage: "https://pbs.twimg.com/media/G6OlvXhacAMw3bC.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "game-ui",
      title: "游戏界面生成",
      titleEn: "Game UI Generation",
      description: "生成游戏界面截图",
      prompt: `帮我生成英雄联盟的游戏界面,中路亚索正在清理兵线`,
      tags: ["游戏", "界面", "UI", "英雄联盟"],
      source: "@canghecode",
      previewImage: "https://pbs.twimg.com/media/G6Ol4gUacAQMdMF.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "promo-design",
      title: "API站点宣传设计",
      titleEn: "API Site Promotion Design",
      description: "创建API站点的宣传画",
      prompt: `兔子 API 站点(https://api.tu-zi.com/) 模型(谷歌的最新画图模型),该模型对文字理解能力更上一层,中文输出也不会错,出图还是高清;兔子站点售价为 0.21 元/次。帮我画一个宣传画,吸引他们来用`,
      tags: ["API", "宣传", "设计", "推广"],
      source: "@tuzi_ai",
      previewImage: "https://pbs.twimg.com/media/G6NBLA4WgAAk9qj.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "quote-card",
      title: "名人名言金句卡",
      titleEn: "Celebrity Quote Card",
      description: "生成名人金句卡片",
      prompt: `一张宽的名人金句卡,棕色背景,衬线体浅金色 "保持饥饿, 保持愚蠢" 小字"——Steve Jobs",文字前面带一个大的淡淡的引号,人物头像在左边,文字在右边,文字占画面比例2/3,人物占1/3,人物有点渐变过渡的感觉 记住:引号里的文字可替换`,
      tags: ["名言", "金句", "卡片", "设计"],
      source: "@stark_nico99",
      previewImage: "https://pbs.twimg.com/media/G6QBjQHbgAE3Yt_?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "conference-scene",
      title: "发布会现场生成",
      titleEn: "Conference Scene Generation",
      description: "将文字变成苹果发布会现场",
      prompt: `根据文字生成一张照片:一个宏大的苹果发布会现场,现场很多观众,场景很暗,有绚丽的灯光,镜头聚焦在很宽的大屏幕,弧形屏幕,文字和屏幕一样有一定的透视感,很小的人物剪影站在舞台上,紫色到蓝色弥散背景上,白色文字有一些渐变,像是现场实拍,高级感 16:9`,
      tags: ["发布会", "苹果", "现场", "大屏幕"],
      source: "@stark_nico99",
      previewImage: "https://pbs.twimg.com/media/G6QnxeCasAIiGHT?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "retro-propaganda-poster",
      title: "复古宣传海报",
      titleEn: "Retro Propaganda Poster",
      description: "生成复古风格的宣传海报",
      prompt: `复古宣传海报风格,突出中文文字,背景为红黄放射状图案。画面中心位置有一位美丽的年轻女性,以精致复古风格绘制,面带微笑,气质优雅,具有亲和力。主题是GPT最新AI绘画服务的广告促销,强调'惊爆价9.9/张'、'适用各种场景、图像融合、局部重绘'、'每张提交3次修改'、'AI直出效果,无需修改',底部醒目标注'有意向点右下"我想要"',右下角绘制一个手指点击按钮动作,左下角展示OpenAI标志。`,
      tags: ["复古", "海报", "宣传", "AI"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/d8ee52518aa3db45867fbaac63b4b57f6ad2e24e96a7519bab0c306747c0da21/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d74685a656a4d675830504752316e50796a315a33742e706e673f763d31",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "satirical-poster",
      title: "讽刺漫画海报",
      titleEn: "Satirical Comic Poster",
      description: "生成讽刺性的漫画海报",
      prompt: `一幅讽刺漫画风格的插画,采用复古美式漫画风格,背景是一个多层货架,货架上都是一样的红色棒球帽,帽子正面印有大字标语"MAKE AMERICA GREAT AGAIN",帽侧贴着白色标签写着"MADE IN CHINA",特写视角聚焦其中一顶红色棒球帽。画面下方有价格牌,原价"$50.00"被粗黑线X划掉,改为"$77.00",色调为怀旧的土黄与暗红色调,阴影处理带有90年代复古印刷质感。整体构图风格夸张讽刺,具讽刺政治消费主义的意味。`,
      tags: ["讽刺", "漫画", "海报", "政治"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/b450db45bb2cffbb6e6f42516630155401b25208160f6af68336aa31f2719db3/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d72657472792d5a383347426f555433447763766f4e3573486d30732e706e673f763d31",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "fashion-magazine-cover",
      title: "时尚杂志封面",
      titleEn: "Fashion Magazine Cover",
      description: "时尚杂志封面风格设计",
      prompt: `一位美丽的女子身穿粉色旗袍,头戴精致的花饰,秀发中点缀着色彩缤纷的花朵,颈间装饰着优雅的白色蕾丝领子。她的一只手轻托着几只大型蝴蝶。整体拍摄风格呈现高清细节质感,类似时尚杂志封面设计,照片上方中央位置标有文字「FASHION DESIGN」。画面背景采用简约的纯浅灰色,以突出人物主体。`,
      tags: ["时尚", "杂志", "封面", "旗袍"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/f06bcee6af14975b53382123ac726fe714fa531b3378e9838a316a62cee318e7/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d4b2d7a4d526c7a753379396245724a68356f4444652e706e673f763d31",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
  ],
};
