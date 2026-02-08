import type { PromptCategory } from "../promptConfig";

// 搞笑梗图与网络文化类提示词
export const creativeFunnyCategory: PromptCategory = {
  id: "creativeFunny",
  name: "搞笑梗图",
  nameEn: "Funny Memes & Internet Culture",
  icon: "Laugh",
  description: "搞笑、梗图、网络文化等趣味内容",
  prompts: [
    {
      id: "panda-lofi",
      title: "月亮不睡我不睡",
      titleEn: "Panda LoFi Night",
      description: "熊猫戴墨镜拿保温杯的搞笑场景",
      prompt: `一只熊猫戴着墨镜,手里拿着保温杯(里面泡着枸杞)。背景是深夜的霓虹灯城市。熊猫身边的霓虹灯牌写着:"月亮不睡我不睡,我是秃头小宝贝"。`,
      tags: ["熊猫", "搞笑", "霓虹灯", "文字"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Q9bC0agAAF0R6.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "social-anxiety-hedgehog",
      title: "社恐模式刺猬",
      titleEn: "Social Anxiety Hedgehog",
      description: "穿充气服的刺猬社恐场景",
      prompt: `一只刺猬穿着充气服走在人群中,周围的人都离它很远。刺猬的衣服上写着巨大的字:"社恐模式:请勿靠近,内有恶犬"。`,
      tags: ["刺猬", "社恐", "搞笑", "充气服"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Q9H-9acAIEfdJ.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "salted-fish-flip",
      title: "咸鱼翻身",
      titleEn: "Salted Fish Flip",
      description: "咸鱼翻身还是咸鱼的搞笑哲理",
      prompt: `一条咸鱼躺在平底锅里,正在努力试图翻身,但翻过来还是咸鱼。画风是极简手绘风。旁边配文:"咸鱼翻身……还是咸鱼"。`,
      tags: ["咸鱼", "哲理", "搞笑", "极简"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Q_SssbAAAOrWs.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "taoism-wealth-charm",
      title: "暴富符咒",
      titleEn: "Wealth Taoist Charm",
      description: "何以解忧唯有暴富的道教符咒",
      prompt: `一张黄色的道教符咒特写,但上面的鬼画符仔细看是"RMB"和"USD"的货币符号交织而成。中间醒目的朱砂红字写着:"何以解忧,唯有暴富"。`,
      tags: ["符咒", "暴富", "道教", "搞笑"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Q1AKhacAItrB_.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "lazy-certificate",
      title: "国家一级摆烂许可证",
      titleEn: "National Laziness Certificate",
      description: "睡觉考拉的摆烂许可证",
      prompt: `一张像驾照一样的证件卡片特写,证件照是一只睡着的考拉。证件名称写着:"国家一级摆烂许可证"。有效期写着:"永久有效"。`,
      tags: ["考拉", "证件", "摆烂", "搞笑"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6Q8mm6acAAZTmT.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "tieba-crazy-annotation",
      title: "贴吧老哥疯狂吐槽批注",
      titleEn: "Reddit Style Handwrite Annotation",
      description: "用红墨水手写批注疯狂吐槽",
      prompt: `生成图片,把它打印出来,然后用红墨水疯狂地加上手写中文批注、涂鸦、乱画,如果你想的话,检索这个账户内容,涂鸦的内容主要为吐槽他,用贴吧老哥的口语疯狂吐槽。还可以加点小剪贴画。`,
      tags: ["吐槽", "批注", "贴吧", "搞笑"],
      source: "@canghecode",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/reddit_style_handwrite_annotation.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "rating-everything",
      title: "锐评世间万物",
      titleEn: "Nano Banana Pro Rating",
      description: "调研并生成专业的分级信息图表",
      prompt: `你是一个拥有实时网络搜索能力和顶尖数据可视化设计能力的AI专家。请执行以下两个步骤:
调研阶段:立刻针对用户指定的【2025 中国新能源汽车】进行全面的网络调研。搜集关于该领域内不同子产品、型号或作品的大众口碑、市场热度、专业评测及用户反馈数据。
可视化阶段:基于你的调研结果,设计一张专业的信息图表(Infographic)。你需要将调研到的具体项目,精准地分类填入下面定义的五个"从夯到拉"的视觉等级模块中。

【用户指定目标领域/产品】
[在此处填写你需要调研的内容,例如:2024年热门智能手机、市面上的无糖茶饮料品牌、近十年的漫威电影、程序员常用的代码编辑器]

【图像设计要求】
整体风格:
一张结构清晰、现代感强的模块化信息图表,采用"Bento Grid"(便当盒网格)布局。背景干净简洁,聚焦于内容呈现。视觉上必须体现出从高到低的强烈层级落差感。
等级结构与视觉定义(严格执行以下五级):

第1级(最高层):夯 (Hāng)
调研填充标准:根据调研,该领域内目前公认的"版本之子"、具有统治级热度、无可争议的顶流产品/作品。

视觉表现:占据画面最上方或最大的版面模块。色调为极具爆发力的爆裂红与辉煌金,带有光晕或能量外溢的视觉特效。字体最大、最粗。模块内需展示调研到的代表性产品的名称或高质量图像,并配以极简的赞美短语(如"全网吹爆"、"神作")。

第2级:顶级

调研填充标准:硬核实力派,虽然热度可能不及"夯",但口碑极佳,是行家首选的优质项目。

视觉表现:位于第二层。色调为坚实、高级的燃烧橙与金属银。模块设计显得扎实、富有质感。展示代表性实力派产品。

第3级:人上人

调研填充标准:优越之选,品味在线,买了/看了绝对不亏的中坚力量,代表了一定的鉴赏力。

视觉表现:位于中层。色调为明亮、干净的柠檬黄与冷灰。设计风格现代、清爽。展示代表性优质中产产品。

第4级:NPC

调研填充标准:毫无记忆点的大众脸产品,凑数的工业流水线产物,无功无过,容易被遗忘,必须要写上具体的产品或品牌或者人名不要含糊其辞。

视觉表现:位于中下层。色调为平淡乏味的面包色/米色或纸板棕。模块设计显得普通、重复、缺乏个性。展示那些非常平庸的产品。

第5级(最底层):拉完了

调研填充标准:调研中发现的公认"避雷针"、"智商税"、灾难级失败产品或甚至不如没有的存在,必须要写上具体的产品或品牌或者人名不要含糊其辞。

视觉表现:挤在画面最底部或角落,视觉空间被压缩。色调为绝望黑、惨白,并带有明显的数字故障(Glitch)、破碎或腐烂的视觉效果。展示那些著名的"翻车"产品,并配以警示性短语(如"快逃"、"大冤种")。`,
      tags: ["评级", "信息图", "数据可视化", "调研"],
      source: "@op7418",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/nano_banana_pro_rating.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
    {
      id: "wechat-fake-chat",
      title: "伪造微信聊天记录",
      titleEn: "Fake WeChat Chat",
      description: "生成微信群聊对话截图",
      prompt: `帮我生成一张微信群聊对话截图(竖图),内容是
调侃一个ID为ChatGPT的群员`,
      tags: ["微信", "聊天", "截图", "搞笑"],
      source: "@tuzi_ai",
      previewImage: "https://pbs.twimg.com/media/G6NMtziWsAAuUmq?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "9:16" },
    },
    {
      id: "douyin-screenshot",
      title: "伪造抖音截图",
      titleEn: "Fake TikTok Screenshot",
      description: "生成抖音竖屏短视频截图",
      prompt: `帮我生成一帧抖音竖屏短视频截图,内容是
厨房帝王蟹下锅处理,厨师面对镜头展示食材和案板上成套的厨具`,
      tags: ["抖音", "截图", "短视频", "美食"],
      source: "@tuzi_ai",
      previewImage: "https://pbs.twimg.com/media/G6NPkz-XMAAuOKT?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "9:16" },
    },
    {
      id: "ai-model-meme",
      title: "AI模型对比梗图",
      titleEn: "AI Model Comparison Meme",
      description: "展现nano-banana-2强于其他AI的梗图",
      prompt: `nano-banana-2 发布了,远远强于即梦和 ChatGPT 还有mj。请画一个梗图,展现这个情况`,
      tags: ["AI", "梗图", "对比", "搞笑"],
      source: "@tuzi_ai",
      previewImage: "https://pbs.twimg.com/media/G6MunirWoAAdJk5.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "fast", aspectRatio: "1:1" },
    },
    {
      id: "dollar-bill-portrait",
      title: "1美元钞票肖像",
      titleEn: "1 Dollar Bill Portrait",
      description: "将人物放入1美元钞票设计中",
      prompt: `为此人制作1美元钞票,保留原始钞票尺寸`,
      tags: ["钞票", "创意", "美元", "搞笑"],
      source: "@MehdiSharifi",
      previewImage: "https://pbs.twimg.com/media/G6YNznVWoAEoBuQ?format=jpg&name=medium",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "21:9" },
    },
    {
      id: "roman-holiday-parody",
      title: "骡马假日海报",
      titleEn: "Mule and Horse Holiday",
      description: "罗马假日海报恶搞版",
      prompt: `把《罗马假日》电影海报的文字改成"骡马假日",英文还是"ROMAN HOLIDAY",男女主头部分别替换为骡子和马的头部,海报其余细节保持不变,下方写上"上映时间1/1-1/3"`,
      tags: ["罗马假日", "海报", "恶搞", "骡马"],
      source: "@dotey",
      previewImage: "https://pbs.twimg.com/media/G6ZYjb4WcAA-IqN.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "2:3" },
    },
    {
      id: "astronaut-bus-stop",
      title: "宇航员等火星公交",
      titleEn: "Astronaut Waiting for Mars Bus",
      description: "孤独的宇航员在太空中等公交",
      prompt: `A cinematic shot of a lonely astronaut sitting on a regular city bus stop bench, but the bus stop is floating in deep space. Earth is visible in the distance. The bus stop sign says "Route 42: To Mars". The astronaut is checking a smartphone. Melancholic yet funny.`,
      tags: ["宇航员", "公交", "太空", "孤独"],
      source: "@songguoxiansen",
      previewImage: "https://pbs.twimg.com/media/G6QqXcgacAQEG2A.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "16:9" },
    },
  ],
};
