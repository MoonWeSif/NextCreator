import type { PromptCategory } from "../promptConfig";

// 中国风与传统文化类提示词
export const creativeChineseCategory: PromptCategory = {
  id: "creativeChinese",
  name: "中国风文化",
  nameEn: "Chinese Culture & Art",
  icon: "Landmark",
  description: "水墨画、国潮、传统文化等中国元素创意",
  prompts: [
    {
      id: "chinese-mythology-characters",
      title: "中国神话角色Q版",
      titleEn: "Chinese Mythology Characters Chibi",
      description: "中国神话角色Q版组合插画",
      prompt: `中国神话角色组合插画,二郎神、孙悟空、哪吒三位经典人物,Q版可爱风格,动态活泼`,
      tags: ["神话", "Q版", "中国", "角色"],
      source: "@dotey",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/chinese_mythology_characters.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "imperial-cat",
      title: "故宫御猫",
      titleEn: "Forbidden City Imperial Cat",
      description: "故宫红墙上的肥猫晒太阳",
      prompt: `真实摄影风格,一只肥胖的狸花猫慵懒地趴在故宫红墙琉璃瓦上晒太阳。猫咪脖子上挂着一个精致的金色吊牌,吊牌上刻着汉字"御猫"。蓝天白云,光影斑驳。`,
      tags: ["故宫", "猫", "御猫", "中国"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6NSh5racA8_oZz.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "guochao-skateboard",
      title: "国潮滑板少年",
      titleEn: "Chinese Style Skateboard Youth",
      description: "穿国潮服饰的少年玩滑板",
      prompt: `潮流插画风格,一个穿着国潮服饰的少年正在玩滑板,滑板底部绘有醒狮图案。背景是涂鸦风格的街头墙壁,墙上喷涂着巨大的汉字"国潮"。色彩高饱和度,动感十足。`,
      tags: ["国潮", "滑板", "少年", "涂鸦"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6NR5mpacAYGp6Z.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "chongqing-hotpot",
      title: "重庆火锅特写",
      titleEn: "Chongqing Hotpot Closeup",
      description: "极其逼真的重庆火锅美食摄影",
      prompt: `一张极其逼真的重庆火锅特写,红油翻滚,辣椒漂浮。画面正中央有一双筷子夹着一片毛肚,背景虚化的墙上有一块木质牌匾,上面写着书法字体"巴适"。色彩鲜艳,让人食欲大增。`,
      tags: ["火锅", "重庆", "美食", "巴适"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6NRp68bwAABgQy.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "lego-mahjong",
      title: "乐高麻将桌",
      titleEn: "LEGO Mahjong Table",
      description: "乐高风格的微缩麻将场景",
      prompt: `乐高风格的微缩摄影。用乐高积木拼搭出的麻将桌场景,四个乐高小人正在打麻将。桌子中间的一张巨大的麻将牌倒下,牌面上清晰地刻着汉字发财。`,
      tags: ["乐高", "麻将", "微缩", "中国"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6NRV2YacAIqEOF.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "qingming-chicago",
      title: "清明上河图芝加哥版",
      titleEn: "Along the River During Qingming Chicago",
      description: "用清明上河图风格绘制现代芝加哥",
      prompt: `一幅宏大的中国传统水墨工笔长卷画,完全模仿北宋张择端《清明上河图》的绘画风格、散点透视构图和古朴泛黄的绢本设色质感。

核心场景: 繁忙的现代芝加哥河滨鸟瞰图。画面焦点是一座巨大的钢铁双层开合桥(杜萨布尔桥/密歇根大道桥),桥面交通极其拥堵,绘满了密密麻麻的现代汽车、黄色的出租车和芝加哥公交车,所有车辆都用毛笔线条精细勾勒。

环境细节: 芝加哥河中满载现代游客的双层游船、水上出租车和皮划艇。河流两岸矗立着密集的古典复兴风格摩天大楼(类似箭牌大厦和论坛报大厦),建筑采用传统的"界画"技法绘制。背景中可见高架铁路结构和正在行驶的"L"线列车。

人物活动: 河滨步道和桥上挤满了成百上千的微小现代人物,他们穿着当代休闲服装,有的在慢跑,有的举着智能手机拍照,有的在路边热狗摊排队购买食物,有的在遛狗。整个画面细节极其丰富,喧闹繁忙,完全使用古老的水墨和大地色调渲染。`,
      tags: ["清明上河图", "芝加哥", "水墨", "跨界"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6ar-ICXgAAH3TF.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "21:9" },
    },
    {
      id: "fairy-on-robot-vacuum",
      title: "仙女站扫地机器人",
      titleEn: "Fairy on Robot Vacuum",
      description: "传统工笔画中仙女站在扫地机器人上飞行",
      prompt: `一幅绘制在陈旧宣纸上的传统中国工笔水墨画。一位身着红色、米色和青色飘带的唐代仙女,头梳高髻佩戴牡丹花,站立在一个圆形的黑色扫地机器人上,在云雾中飞行。
她右手拿着一个香草冰淇淋蛋筒在吃。左手提着一个棕色的路易威登(Louis Vuitton)老花手提包。在她下方,一只小猫头鹰背着一只打着荷叶伞的青蛙在飞翔。背景是水墨云雾和远山。
左上角有书法题字,并有一个红色的长方形艺术家印章,印文为"寶玉"。`,
      tags: ["仙女", "工笔画", "扫地机器人", "穿越"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6ac3vXXwAAf2oF.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "noblewoman-minions",
      title: "贵妇与小黄人仆人",
      titleEn: "Noblewoman and Minion Servants",
      description: "工笔画风格唐朝贵妇被小黄人服侍",
      prompt: `A traditional Chinese ink and color painting in Gongbi style on aged rice paper texture. A noblewoman in elaborate Tang Dynasty Hanfu robes sits on a wooden stool, holding a modern hairdryer to dry her long flowing hair. She is wearing black stockings, red high heels on one foot, resting on a small stool.

Three Minions dressed in ancient Chinese servant robes and hats attend to her: one on the left looks stressed holding the hairdryer's power cord, one center kneels polishing her red shoe with a cloth, and one on the right holds up a smartphone taking a photo for her. The background features classical gnarled pine trees, bamboo groves, and Taihu rocks.

Traditional Chinese calligraphy written in the top right corner, accompanied by a red artist chop seal (寶玉). The color palette is muted mineral pigments. Humorous, anachronistic fusion. --ar 16:9`,
      tags: ["工笔画", "小黄人", "贵妇", "穿越"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6ZOMb_WEAAVKF6.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "monk-taoist-nun-comic",
      title: "和尚道长师太三格漫画",
      titleEn: "Monk Taoist Nun Comic",
      description: "香港武侠漫画风格的搞笑三格漫画",
      prompt: `画一张3格漫画,香港武侠漫画风格,故事情节如下:
和尚:"师太,你从了和尚吧!"
道长:"秃驴,竟敢跟贫道抢师太!"
师太:"和尚、道长你们一起上吧,我赶时间。"`,
      tags: ["漫画", "武侠", "搞笑", "三格"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6aL3REXIAAPjLh.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "orange-koi-illustration",
      title: "橙白锦鲤插画",
      titleEn: "Orange Koi Illustration",
      description: "极简水彩风格的锦鲤与樱花",
      prompt: `一幅醒目的插画,画面中心有三条橙白相间的锦鲤,优雅地游曳于深灰色池塘之中。池水表面漂浮着柔和的粉色樱花花瓣,背景中呈现浅粉色的水波涟漪,增添浪漫的季节感。画面上方或侧面以白色优美的汉字书写'錦鯉'。

整体风格采用极简的水彩画设计,细节精致细腻,融合现代元素与传统美学,呈现出简洁而时尚的艺术气息。`,
      tags: ["锦鲤", "水彩", "樱花", "极简"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6Vhd2UXYAAfG4W.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "rose-wall-art",
      title: "蔷薇少女墙绘",
      titleEn: "Rose Girl Wall Art",
      description: "蔷薇花与女子头发融合的街头壁画",
      prompt: `一幅超高清晰度、摄影质感极强的街头壁画,画面呈现强烈的中国风韵味。

画中描绘着一位绝美的卡通风女子正面特写头像,她神态柔美而宁静。墙体顶部被一大片盛开的蔷薇花覆盖,茂密的绿叶与繁盛的花朵向外舒展,部分枝条从墙顶垂落而下,与女子的头发巧妙融合,使她的秀发宛如由层层叠叠的蔷薇花组成。这些繁密的花朵簇拥着女子的头部,形成了一顶瑰丽的花冠,视觉效果华美浪漫。

背景中蓝天澄澈,点缀着朵朵白云;地面为一条细节真实的沥青街道,上面散落着缤纷多彩的花瓣,行人悠然漫步其间。整体场景细节精致入微,光影明亮柔和,营造出犹如现实般的梦幻街景氛围。`,
      tags: ["壁画", "蔷薇", "街头艺术", "中国风"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6TbXGAWIAAFzPx.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "sichuan-opera-reveal",
      title: "川剧变脸解密",
      titleEn: "Sichuan Opera Face Change Reveal",
      description: "川剧变脸绝技的拆解图",
      prompt: `生成一张中国川剧变脸这门绝技的解密拆解图,中文字体不要变形。宽高比16:9`,
      tags: ["川剧", "变脸", "解密", "中国"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Pi-ewaUAAhxfM.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
