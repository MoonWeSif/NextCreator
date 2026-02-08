import type { PromptCategory } from "../promptConfig";

// 艺术风格转换类提示词
export const creativeStyleCategory: PromptCategory = {
  id: "creativeStyle",
  name: "风格转换",
  nameEn: "Style Transformation",
  icon: "Palette",
  description: "各种艺术风格转换、特效处理、材质替换",
  prompts: [
    {
      id: "mosaic-pixel-avatar",
      title: "马赛克风格头像",
      titleEn: "Mosaic Pixel Avatar",
      description: "低多边形马赛克风格转换",
      prompt: `Transform this image into a refined low-poly mosaic style. Preserve the original structure and recognizable details, especially facial features and contours. Use small, high-density polygons to maintain clarity and identity while creating a crystalline, faceted look. Keep the original color palette for a harmonious and natural aesthetic. Avoid altering or adding new elements.`,
      tags: ["马赛克", "像素", "低多边形", "头像"],
      source: "@fy360593",
      previewImage: "https://pbs.twimg.com/media/Gv5ykAJa4AE3BGm.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
    },
    {
      id: "gorillaz-style",
      title: "Gorillaz风格插图",
      titleEn: "Gorillaz Style Illustration",
      description: "粗糙的Gorillaz乐队风格转换",
      prompt: `将此图像重新设计成粗糙的Gorillaz风格插图,大胆厚黑轮廓,锐利棱角边缘,平面表现照明,风格化高对比阴影,脏乱破损表面纹理, muted color palette: washed-out teals, olive greens, rusty reds, mustard yellows, dusty browns, raw grungy urban atmosphere, comic book flatness mixed with painterly grit, hand-drawn finish with faded gradients, graphic novel aesthetic with a rebellious, animated tone, dark stylish tone, full of attitude。`,
      tags: ["Gorillaz", "插画", "风格", "涂鸦"],
      source: "@azed_ai",
      previewImage: "https://pbs.twimg.com/media/GvV0CElbQAAy7SL.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "1920s-fairy-tale",
      title: "1920年代童话插图",
      titleEn: "1920s Fairy Tale Illustration",
      description: "Arthur Rackham风格的童话插图",
      prompt: `将此图像转换为1920年代童话插图,风格如Arthur Rackham。使用muted watercolor tones和intricate ink linework。填充场景以奇幻森林生物、扭曲树枝和隐藏魔法物体。整体色调神秘、迷人且略微诡异。添加手写书法风格的字幕和谜语。`,
      tags: ["童话", "1920年代", "水彩", "奇幻"],
      source: "@vkuoo",
      previewImage: "https://pbs.twimg.com/media/GsezilOaYAAqCpa.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "1950s-poster-style",
      title: "1950年代海报",
      titleEn: "1950s Poster Style",
      description: "中世纪现代主义平面设计海报",
      prompt: `将此图像转换为1950年代海报,风格如mid-century modern graphic designers。使用flat, geometric color blocks with strong typographic elements。整体色调乐观、怀旧且促销。添加大胆位置标签和促销口号。`,
      tags: ["1950年代", "海报", "复古", "平面"],
      source: "@vkuoo",
      previewImage: "https://pbs.twimg.com/media/Gsq9KwEagAARnH0.jpg?format=jpg&name=large",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "3:4" },
    },
    {
      id: "glass-retexture",
      title: "玻璃材质重塑",
      titleEn: "Glass Material Retexture",
      description: "将物体材质转换为玻璃质感",
      prompt: `retexture the image attached based on the json below:

{
  "style": "photorealistic",
  "material": "glass",
  "background": "plain white",
  "object_position": "centered",
  "lighting": "soft, diffused studio lighting",
  "camera_angle": "eye-level, straight-on",
  "resolution": "high",
  "aspect_ratio": "2:3",
  "details": {
    "reflections": true,
    "shadows": false,
    "transparency": true
  }
}`,
      tags: ["玻璃", "材质", "转换", "3D"],
      source: "@egeberkina",
      previewImage: "https://camo.githubusercontent.com/f6ea76545847586388ceb6dc749054b2a91be35fe42c51eb9f2e3cdd31337ebc/68747470733a2f2f626962696770742d617070732e636861747669642e61692f63686174696d672f67656d696e692d72657472792d51436453414e324979696779485656706c7058474c2e706e673f763d31",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "2:3" },
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
      id: "childrens-book-crayon",
      title: "儿童图书蜡笔画",
      titleEn: "Children's Book Crayon Style",
      description: "儿童图书插画风格的蜡笔画",
      prompt: `DRAWING a drawing of [Character], crayon on white paper, in the style of a children's book illustration – simple, cute, and full-color, with [two glitter accent colors] glitter accents and high detail.`,
      tags: ["儿童", "蜡笔", "插画", "可爱"],
      source: "@GoSailGlobal",
      previewImage: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/childrens_book_crayon_style.jpg",
      nodeTemplate: { requiresImageInput: false, generatorType: "pro", aspectRatio: "3:4" },
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
      id: "painting-process-four-panel",
      title: "绘画过程四宫格",
      titleEn: "Painting Process Four Panels",
      description: "照片变插画并附带绘画过程",
      prompt: `为人物生成绘画过程四宫格,第一步:线稿,第二步平铺颜色,第三步:增加阴影,第四步:细化成型。不要文字`,
      tags: ["绘画", "过程", "四宫格", "教程"],
      source: "@ZHO_ZHO_ZHO",
      previewImage: "https://pbs.twimg.com/media/GzmdRuBboAAXOTg.jpg",
      nodeTemplate: { requiresImageInput: true, generatorType: "pro", aspectRatio: "1:1" },
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
  ],
};
