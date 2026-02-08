import type { PromptCategory } from "../promptConfig";

// 生活娱乐类提示词
export const lifestyleCategory: PromptCategory = {
  id: "lifestyle",
  name: "生活娱乐",
  nameEn: "Lifestyle & Entertainment",
  icon: "Heart",
  description: "日常生活、旅行、穿搭、滤镜等生活场景",
  prompts: [
    {
      id: "outfit-change",
      title: "换装",
      titleEn: "Outfit Change",
      description: "将人物服装替换为参考图像中的服装",
      prompt: `将输入图像中人物的服装替换为参考图像中显示的目标服装。保持人物的姿势、面部表情、背景和整体真实感不变。让新服装看起来自然、合身,并与光线和阴影保持一致。不要改变人物的身份或环境——只改变衣服`,
      tags: ["换装", "服装", "穿搭", "编辑"],
      source: "@skirano",
      previewImage: "https://i.mji.rip/2025/09/04/b9c7402974fba6627ab1b0bf3fce065d.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "hairstyle-change",
      title: "换发型",
      titleEn: "Hairstyle Change",
      description: "为照片中的主要人物更换新发型",
      prompt: `请仔细分析我提供的照片。你的任务是为照片中的主要人物更换一个新的发型,同时必须严格遵守以下规则:
1.  **身份保持**:必须完整保留人物的面部特征、五官、皮肤纹理和表情,确保看起来是同一个人。
2.  **背景不变**:人物所处的背景、环境和光线条件必须保持原样,不做任何改动。
3.  **身体姿态不变**:人物的头部姿态、身体姿势和穿着的衣物必须保持不变。
4.  **无缝融合**:新的发型需要根据人物的头型、脸型和现场光照进行智能调整,确保发丝的质感、光泽和阴影都与原始照片完美融合,达到高度逼真、无缝衔接的效果。

---
**女士发型参考:**
*   飘逸的长直发 (Flowing long straight hair)
*   浪漫的大波浪卷发 (Romantic wavy curls)
*   俏皮的短波波头 (Playful short bob)
*   优雅的法式刘海和及肩发 (Elegant French bangs with shoulder-length hair)
*   精致的复古盘发 (Exquisite vintage updo)
*   帅气利落的超短发/精灵短发 (Chic and neat pixie cut)
*   蓬松的羊毛卷 (Fluffy afro curls)
*   高马尾 (High ponytail)
*   脏辫 (Dreadlocks)
*   银灰色渐变长发 (Silver-grey ombre long hair)

**男士发型参考:**
*   经典的商务背头 (Classic business slick-back)
*   时尚的纹理短发/飞机头 (Modern textured short hair / Quiff)
*   清爽的圆寸 (Clean buzz cut)
*   复古中分发型 (Retro middle part hairstyle)
*   蓬松的韩式卷发 (Fluffy Korean-style curly hair)
*   随性的及肩长发 (Casual shoulder-length long hair)
*    undercut发型(两侧剃短,顶部留长)(Undercut)
*   莫霍克发型 (Mohawk)
*   武士发髻/丸子头 (Man bun)
---

请将人物的发型更换为: 俏皮的短波波头`,
      tags: ["发型", "换发型", "造型", "编辑"],
      source: "Official",
      previewImage: "https://i.mji.rip/2025/09/04/c4dffca8a2916cd1fbefa21237751b81.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "photo-upscale-enhance",
      title: "智能扩图和增强",
      titleEn: "Smart Image Enhancement",
      description: "智能扩图到16:9并提高画质",
      prompt: `缩小并扩展此图像至16:9的宽高比(电脑壁纸尺寸)。
情境感知:在左右两侧无缝地扩展场景。完美匹配原始的光线、天气和纹理。
逻辑补全:如果边界上有被切断的物体(如肩膀、树枝或建筑边缘),根据逻辑推理自然地补全它们。不要扭曲原始的中心图像。`,
      tags: ["扩图", "壁纸", "增强", "16:9"],
      source: "Wechat@01Founder",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/image_outpainting.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "id-photo",
      title: "证件照制作",
      titleEn: "ID Photo Creation",
      description: "制作标准2寸证件照",
      prompt: `截取图片人像头部,帮我做成 2 寸证件照,要求: 1、白底 2、职业正装 3、正脸 4、完全保持人物面部特征一致,仅改变姿态与构图,面部依旧保留原有神态,只在角度和光线中体现变化,局部捕捉颧骨、眉毛、眼神、鼻子、嘴唇的细节 5、保留面部皮肤轻微瑕疵,不要过度磨皮`,
      tags: ["证件照", "2寸", "正装", "白底"],
      source: "LinuxDO@synbio",
      previewImage: "https://i.mji.rip/2025/09/04/5258e0b792acebf8096aa4da3462a952.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "miniature-version",
      title: "微型人偶版本",
      titleEn: "Miniature Doll Version",
      description: "创建自己的超真实微型版本",
      prompt: `创建一个微型版本的我,手持展示,保持真实面部不变。`,
      tags: ["微型", "人偶", "手办", "创意"],
      source: "@Samann_ai",
      previewImage: "https://pbs.twimg.com/media/G4Q69zjWAAAv0vI.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "car-three-views",
      title: "汽车三视图摆拍",
      titleEn: "Car Three Views Portrait",
      description: "汽车三视图风格的人像摄影",
      prompt: `一个情绪化的、高分辨率编辑肖像,上传照片中的男人(保持他的脸100%准确)。他坐在一个复古电吉他前面,而不是放大器。他的手臂随意靠在吉他的身体和脖子上。吉他具有磨损的经典摇滚外观——深色木纹、金属硬件和微妙的划痕,赋予它个性。
他穿着宽松的彩色针织毛衣,带有混合条纹和拼布纹理。他的头发凌乱且波浪状,有完整的胡须。他的表情严肃,直视镜头。
背景是纯浅灰色工作室墙。柔和的工作室照明在他的脸、吉他和毛衣上创造温和的阴影,赋予平静的电影心情。框架聚焦于他的上身、手和吉他的细节。一切锐利,突出针织纹理和吉他的复古表面。
整体氛围原始、艺术且时尚,像高端杂志的音乐家肖像。`,
      tags: ["汽车", "三视图", "人像", "摄影"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6ajRp1XcAAsjNF.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "fashion-mood-board",
      title: "时尚心情板拼贴",
      titleEn: "Fashion Mood Board Collage",
      description: "创建时尚心情板风格的拼贴",
      prompt: `时尚心情板拼贴。用剪裁的模特所穿的单个物品围绕肖像。添加手写笔记和草图,使用俏皮的马克笔风格字体,并用英语标注每个物品的品牌名称和来源。整体美学应创意且可爱。`,
      tags: ["时尚", "心情板", "拼贴", "穿搭"],
      source: "@tetumemo",
      previewImage: "https://pbs.twimg.com/media/GzwhyfabAAAZpHO.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "subject-transparent-bg",
      title: "提取主体透明背景",
      titleEn: "Subject Extraction Transparent BG",
      description: "提取图片主体并放置透明背景",
      prompt: `提取附件图片主体并放置透明背景`,
      tags: ["抠图", "透明背景", "主体", "提取"],
      source: "@nglprz",
      previewImage: "https://pbs.twimg.com/media/GzihRpAXkAICIRs.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "meal-calorie-annotation",
      title: "餐食热量标注",
      titleEn: "Meal Calorie Annotation",
      description: "为餐食标注食物名称和热量信息",
      prompt: `为这顿餐标注食物名称、热量密度和大致热量`,
      tags: ["热量", "餐食", "标注", "健康"],
      source: "@icreatelife",
      previewImage: "https://pbs.twimg.com/media/G0BGNFsXsAAdCNF.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "fast", aspectRatio: "16:9" },
    },
    {
      id: "old-photo-restore",
      title: "老照片恢复与现代化",
      titleEn: "Old Photo Restoration",
      description: "将旧照片编辑成现代美学风格",
      prompt: `请将我的旧照片编辑成1080 x 1920像素,具有美学和现代摄影外观,使其看起来真实并增强颜色。`,
      tags: ["老照片", "恢复", "现代化", "增强"],
      source: "@marryevan999",
      previewImage: "https://pbs.twimg.com/media/G1wsdR9bYAEdsrJ.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "pixar-style-avatar",
      title: "照片转皮克斯头像",
      titleEn: "Photo to Pixar Avatar",
      description: "将照片转换为皮克斯风格Q版头像",
      prompt: `使用附件图像中的年轻男性的3D头像,快乐微笑,干净白色背景,像素风格的概念数字艺术,高品质,柔和照明,光滑纹理,鲜艳颜色,现实比例带卡通触感及工作室渲染外观。`,
      tags: ["皮克斯", "头像", "3D", "卡通"],
      source: "@NanoBanana_labs",
      previewImage: "https://pbs.twimg.com/media/G6QBjQHbgAE3Yt_?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "childhood-self-therapy",
      title: "与童年自我疗愈对话",
      titleEn: "Childhood Self Therapy Dialogue",
      description: "创建成人与儿童自己对话的疗愈场景",
      prompt: `使用两张上传照片作为相似度参考:
- 成人参考:[成人照片]
- 儿童参考:[儿童照片]

提示:照片现实主义极简疗愈室;浅色墙壁、灰色沙发、木质咖啡桌带纸巾盒、笔记本和一杯水、简单相框和落地灯、柔和自然日光。同一人两个年龄并排坐:成人左侧用开放手势说话;儿童右侧低头倾听。两者穿相同[服装](相同颜色和风格)。干净工作室氛围,居中构图,浅景深,50mm外观,4K,垂直3:4。无额外人物、无文字、无水印。`,
      tags: ["疗愈", "童年", "对话", "心理"],
      source: "@samann_ai",
      previewImage: "https://pbs.twimg.com/media/G1Xvq7EXgAAAKqO.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "coloring-simulation",
      title: "模拟着色作业过程",
      titleEn: "Coloring Process Simulation",
      description: "模拟数位板上的着色过程",
      prompt: `照片现实主义数位板屏幕。第一人称手持数位板和笔。
原始图像在数位板上以未完成状态重现。从原始图像提取线稿。线稿部分已用与原始图像相同的着色着色。未完成着色。不得为单色。着色完成约70%。
特写。笔尖触碰平板屏幕。`,
      tags: ["着色", "数位板", "过程", "绘画"],
      source: "@AI_Kei75",
      previewImage: "https://pbs.twimg.com/media/G1HlmCbaQAACWR_.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "rpg-character-sheet",
      title: "RPG角色状态屏",
      titleEn: "RPG Character Status Screen",
      description: "生成角色的游戏状态屏",
      prompt: `使用原始图像中的角色创建RPG游戏的角色状态屏。
保持原始图像的角色设计和风格,但将服装更改为幻想RPG中的服装。同时,将姿势更改为适合情况的姿势。
将原始图像中的角色和状态屏并排显示。
状态屏将列出各种参数、技能、图标等。
背景应为与原始图像风格匹配的幻想背景。
状态屏应丰富且时尚,像2025年的游戏一样。`,
      tags: ["RPG", "游戏", "角色", "状态屏"],
      source: "@AI_Kei75",
      previewImage: "https://pbs.twimg.com/media/G1SRC2DbQAksQEA.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "giant-monster-hug",
      title: "巨型怪物拥抱",
      titleEn: "Giant Monster Hug",
      description: "坐在巨型可爱卡通怪物旁被拥抱",
      prompt: `让我坐在一个巨型 fluffy 可爱卡通怪物旁边。我是真实 realistic 的,但怪物是 3d 卡通。它在 hugging 我,很可爱。大眼睛。我们在房子里床上。`,
      tags: ["怪物", "拥抱", "可爱", "3D"],
      source: "@eyishazyer",
      previewImage: "https://pbs.twimg.com/media/G4LhQojWgAAYrFB.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "metal-coin-portrait",
      title: "金属硬币肖像",
      titleEn: "Metal Coin Portrait",
      description: "创建带有人物浮雕的金属硬币",
      prompt: `一个详细的金属硬币,特征是图像中附带的人的面部(不要改变上传照片中人的面部特征。保持人面部 100% 准确于参考图像。保持附带人的原始面部不变且 realistic)浮雕侧面,制作有 realistic 雕刻纹理和精细浮雕细节。硬币表面显示光反射、刮痕和金属光泽。在边框周围包括微妙铭文或符号,以类似于真实铸造。居中于黑暗、简约背景,以强调硬币的纹理和现实主义。`,
      tags: ["硬币", "金属", "浮雕", "肖像"],
      source: "@eyishazyer",
      previewImage: "https://pbs.twimg.com/media/G4LgRI6W4AAHQya.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "rock-casual-portrait",
      title: "岩石上休闲肖像",
      titleEn: "Casual Rock Portrait",
      description: "地中海风格岩石上的休闲肖像",
      prompt: `一个超现实肖像,一个年轻男子坐在大型、光滑白色岩石形成下,在自然阳光下。穿着宽松、略微 crumpled 的米色亚麻衬衫,上部纽扣打开,配以白色裤子。他的服装给人放松、地中海 vibe。他向后倾斜,一臂靠在岩石上,另一只手放在膝盖上,略微侧视。戴着修身黑色矩形太阳镜。他的发型短而略微 messy,阳光投射柔和阴影穿过他的服装和 textured 岩石。整体氛围平静、时尚,受地中海启发。面部应与参考照片完全匹配。`,
      tags: ["岩石", "休闲", "地中海", "肖像"],
      source: "@eyishazyer",
      previewImage: "https://pbs.twimg.com/media/G4LhvLLXIAAbaHi.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "bw-fashion-portrait",
      title: "时尚编辑黑白肖像",
      titleEn: "BW Fashion Editorial Portrait",
      description: "创建黑白高时尚编辑肖像",
      prompt: `创建一个黑白的高时尚编辑肖像,保持参考照片中我的真实面部不变(无编辑,相同特征,无修饰)。穿着宽松的白衬衫。姿势大胆而富有表现力,一臂举起握住头发,部分覆盖面部。目光强烈,直视相机,创造强大而神秘的气场。背景是简约墙壁,尖锐自然日光投射定义阴影,添加深度和对比。照明 harsh 和高对比,突出面部轮廓、尖锐颧骨,以及头发和织物的纹理。风格应感觉 raw、戏剧性和艺术性。整体图像是高时尚编辑的黑白、电影般的和 striking。`,
      tags: ["黑白", "时尚", "编辑", "肖像"],
      source: "@eyishazyer",
      previewImage: "https://pbs.twimg.com/media/G4LgrQYWAAA5ink.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "time-filter",
      title: "时光滤镜",
      titleEn: "Time Period Filter",
      description: "将人物完全符合特定年代的风格",
      prompt: `请重新构想照片中的人物,使其完全符合某个特定年代的风格。这包括人物的服装、发型、照片的整体画质和滤镜和构图,以及该年代所特有的整体美学风格。最终输出必须是高度逼真的图像,并清晰地展现人物。

目标年代为: 1900`,
      tags: ["时代", "滤镜", "复古", "风格"],
      source: "Official",
      previewImage: "https://i.mji.rip/2025/09/04/281360a8257436f6ad0b5e56b0982deb.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "anime-expressions-sheet",
      title: "二次元表情包表",
      titleEn: "Anime Expressions Sheet",
      description: "生成角色多种表情的表情表",
      prompt: `Character emotions sheet, multiple expressions of the provided character, featuring happy, sad, angry, surprised, shy, confused, playful, disgusted, thoughtful, crying, and embarrassed. Full set of emotions, clear and distinct expressions, clean background`,
      tags: ["表情", "二次元", "情绪", "角色"],
      source: "@Gorden_Sun",
      previewImage: "https://i.mji.rip/2025/09/04/efc060e59e2d9c2e4a137db8564fc492.png",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "batch-hairstyles",
      title: "批量换发型九宫格",
      titleEn: "Batch Hairstyles Grid",
      description: "以九宫格方式生成不同发型",
      prompt: `以九宫格的方式生成这个人不同发型的头像`,
      tags: ["发型", "九宫格", "批量", "造型"],
      source: "@balconychy",
      previewImage: "https://github.com/PicoTrex/Awesome-Nano-Banana-images/blob/main/images/case15/output.jpg?raw=true",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "personalized-room-design",
      title: "个性化房间设计",
      titleEn: "Personalized Room Design",
      description: "为用户生成个性化的房间3D设计",
      prompt: `为我生成我的房间设计(床、书架、沙发、绿植、电脑桌和电脑),墙上挂着绘画,窗外是城市夜景。可爱 3d 风格,c4d 渲染,轴测图。`,
      tags: ["房间", "设计", "3D", "个性化"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://camo.githubusercontent.com/f86750e53827b3ce50daf102593abaa544806ce443edccdc54e759ef06c05977/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d676a6577334e754467686a4364544e34684e6341642e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "character-portal-transition",
      title: "角色穿越传送门",
      titleEn: "Character Portal Transition",
      description: "Q版角色穿过传送门牵观众的手",
      prompt: `照片中的角色的 3D Q 版形象穿过传送门,牵着观众的手,在将观众拉向前时动态地回头一看。传送门外的背景是观众的现实世界,一个典型的程序员的书房,有书桌,显示器和笔记本电脑,传送门内是角色所处的3D Q 版世界,细节可以参考照片,整体呈蓝色调,和现实世界形成鲜明对比。传送门散发着神秘的蓝色和紫色色调,是两个世界之间的完美椭圆形框架处在画面中间。从第三人称视角拍摄的摄像机角度,显示观看者的手被拉入角色世界。2:3 的宽高比。`,
      tags: ["传送门", "Q版", "3D", "穿越"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/7f61e4301bcbc9eb3a7dcbbe569ed2233690a754bf7c704116bee4a79447cf1d/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d784c734937614b347a7956576352774a34366132452e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "2:3" },
    },
    {
      id: "polaroid-breakout",
      title: "拍立得出框效果",
      titleEn: "Polaroid Breakout Effect",
      description: "角色从拍立得照片中走出",
      prompt: `将场景中的角色转化为3D Q版风格,放在一张拍立得照片上,相纸被一只手拿着,照片中的角色正从拍立得照片中走出,呈现出突破二维相片边框、进入二维现实空间的视觉效果。`,
      tags: ["拍立得", "出框", "3D", "Q版"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/7f362f5b4cf2ada98d76ee033f5fa18226c5ab99c5a2188ae8c897039d654bfa/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d5f6372464d6f353774544a317474506b50437465312e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "3d-q-conversion",
      title: "3D Q版风格转换",
      titleEn: "3D Chibi Style Conversion",
      description: "将场景角色转化为3D Q版风格",
      prompt: `将场景中的角色转化为3D Q版风格,同时保持原本的场景布置和服装造型不变。`,
      tags: ["3D", "Q版", "转换", "风格"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/b4bcf766d8e48c5bc7c4182b3139eb084bb7cec7acf2742456f94167dac6170c/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d44543877756b783266484863727858516f7361524c2e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "couple-jewelry-box",
      title: "3D情侣珠宝盒",
      titleEn: "3D Couple Jewelry Box",
      description: "打造情侣主题的3D收藏摆件",
      prompt: `根据照片上的内容打造一款细致精美、萌趣可爱的3D渲染收藏摆件,装置在柔和粉彩色调、温馨浪漫的展示盒中。展示盒为浅奶油色搭配柔和的金色装饰,形似精致的便携珠宝盒。打开盒盖,呈现出一幕温暖浪漫的场景:两位Q版角色正甜蜜相望。盒顶雕刻着"FOREVER TOGETHER"(永远在一起)的字样,周围点缀着小巧精致的星星与爱心图案。盒内站着照片上的女性,手中捧着一束小巧的白色花束。她的身旁是她的伴侣,照片上的男性。两人都拥有大而闪亮、充满表现力的眼睛,以及柔和、温暖的微笑,传递出浓浓的爱意和迷人的气质。他们身后有一扇圆形窗户,透过窗户能看到阳光明媚的中国古典小镇天际线和轻柔飘浮的云朵。盒内以温暖的柔和光线进行照明,背景中漂浮着花瓣点缀气氛。整个展示盒和角色的色调优雅和谐,营造出一个奢华而梦幻的迷你纪念品场景。尺寸:9:16`,
      tags: ["情侣", "珠宝盒", "3D", "收藏"],
      source: "@dotey",
      previewImage: "https://camo.githubusercontent.com/df1beca498c52bcfa41327ebeb14c56763c588c716300d8613539074147d8ebf/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d72657472792d595758586c5344524d3956547a69512d49413257532e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "9:16" },
    },
    {
      id: "vietnamese-ao-dai",
      title: "越南奥黛风艺术照",
      titleEn: "Vietnamese Ao Dai Art Photo",
      description: "创建穿越南奥黛的超写实肖像",
      prompt: `创建一个超写实的人物肖像(保留确切的真实面部和身体特征,不做任何改动),8K高分辨率的超现实肖像画。
画面中是一位年轻、优雅的女性,穿着传统的白色丝绸肚兜和飘逸的深绿色长裙。她身体微微倾斜,右手优雅地弯曲手肘,在右脸颊附近举着一朵新鲜的白莲花。她的左手轻轻地放在大腿上。她的头微微倾向莲花,眼神宁静而梦幻地看着花朵,带着一丝微妙的微笑。她的黑发盘成一个高高的波浪形发髻,几缕发丝勾勒出她白皙、容光焕发的脸庞。
背景是渐变的橄榄绿色,带有柔和、温暖的光晕,突出了丝绸肚兜的质感、娇嫩的莲花花瓣和她光滑的皮肤。旁边一张雕刻精美的木桌上放着一个装满白莲花的大白花瓶。
电影般的构图,背景虚化,超清晰的细节,逼真的阴影,杰作,照片级真实感。`,
      tags: ["越南", "奥黛", "传统", "艺术照"],
      source: "@ShreyaYadav___",
      previewImage: "https://pbs.twimg.com/media/G5YBkPtbYAAVDEr?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
  ],
};
