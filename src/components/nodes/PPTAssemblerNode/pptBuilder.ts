import PptxGenJS from "pptxgenjs";
import type { PPTPageData, ProcessedPage } from "./types";
import { toast } from "@/stores/toastStore";

export interface BuildPPTOptions {
  title: string;
  pages: PPTPageData[];
  aspectRatio: "16:9" | "4:3";
}

// 可编辑 PPT 构建选项
export interface BuildEditablePPTOptions {
  title: string;
  pages: ProcessedPage[];
  aspectRatio: "16:9" | "4:3";
}

// 构建 PPT 文件 - 图片铺满整页
export async function buildPPT(options: BuildPPTOptions): Promise<Blob> {
  const { title, pages, aspectRatio } = options;

  // 创建 PPT 实例
  const pptx = new PptxGenJS();

  // 设置 PPT 属性
  pptx.title = title;
  pptx.author = "NextCreator";
  pptx.subject = title;

  // 设置幻灯片尺寸
  let slideWidth: number;
  let slideHeight: number;

  if (aspectRatio === "16:9") {
    slideWidth = 10;
    slideHeight = 5.625;
    pptx.defineLayout({ name: "WIDE", width: slideWidth, height: slideHeight });
    pptx.layout = "WIDE";
  } else {
    slideWidth = 10;
    slideHeight = 7.5;
    pptx.defineLayout({ name: "STANDARD", width: slideWidth, height: slideHeight });
    pptx.layout = "STANDARD";
  }

  // 遍历页面生成幻灯片 - 图片铺满整页
  for (const page of pages) {
    const slide = pptx.addSlide();

    // 添加图片 - 铺满整页
    if (page.image) {
      slide.addImage({
        data: `data:image/png;base64,${page.image}`,
        x: 0,
        y: 0,
        w: slideWidth,
        h: slideHeight,
        sizing: {
          type: "cover",
          w: slideWidth,
          h: slideHeight,
        },
      });
    }

    // 添加备注（讲稿）
    if (page.script) {
      slide.addNotes(page.script);
    }
  }

  // 生成 PPT Blob
  const blob = await pptx.write({ outputType: "blob" }) as Blob;
  return blob;
}

// 下载 PPT 文件
export async function downloadPPT(options: BuildPPTOptions): Promise<void> {
  const blob = await buildPPT(options);
  const fileName = `${options.title || "PPT"}.pptx`;

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
    });

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await writeFile(filePath, bytes);
      toast.success(`PPT 已保存到: ${filePath.split("/").pop()}`);
    }
  } catch (error) {
    console.error("保存 PPT 失败:", error);
    toast.error(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    throw error;
  }
}

// 构建可编辑 PPT 文件 - 背景图 + 文本框
export async function buildEditablePPT(options: BuildEditablePPTOptions): Promise<Blob> {
  const { title, pages, aspectRatio } = options;

  // 创建 PPT 实例
  const pptx = new PptxGenJS();

  // 设置 PPT 属性
  pptx.title = title;
  pptx.author = "NextCreator";
  pptx.subject = title;

  // 设置幻灯片尺寸
  let slideWidth: number;
  let slideHeight: number;

  if (aspectRatio === "16:9") {
    slideWidth = 10;
    slideHeight = 5.625;
    pptx.defineLayout({ name: "WIDE", width: slideWidth, height: slideHeight });
    pptx.layout = "WIDE";
  } else {
    slideWidth = 10;
    slideHeight = 7.5;
    pptx.defineLayout({ name: "STANDARD", width: slideWidth, height: slideHeight });
    pptx.layout = "STANDARD";
  }

  // 遍历页面生成幻灯片
  for (const page of pages) {
    const slide = pptx.addSlide();

    // 1. 添加背景图（去除文字后的图片）
    if (page.backgroundImage) {
      slide.addImage({
        data: `data:image/png;base64,${page.backgroundImage}`,
        x: 0,
        y: 0,
        w: slideWidth,
        h: slideHeight,
        sizing: {
          type: "cover",
          w: slideWidth,
          h: slideHeight,
        },
      });
    }

    // 2. 添加可编辑文本框
    // 需要将像素坐标转换为幻灯片坐标
    // 假设原图尺寸与幻灯片比例一致
    if (page.textBoxes && page.textBoxes.length > 0) {
      // 使用实际图片尺寸进行缩放，缺省则回退到常用尺寸
      const imgWidth = page.sourceWidth || (aspectRatio === "16:9" ? 1920 : 1920);
      const imgHeight = page.sourceHeight || (aspectRatio === "16:9" ? 1080 : 1440);

      // 计算缩放比例
      const scaleX = slideWidth / imgWidth;
      const scaleY = slideHeight / imgHeight;

      for (const box of page.textBoxes) {
        if (!box.text || box.width <= 0 || box.height <= 0) continue;

        // 转换坐标
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.width * scaleX;
        const h = box.height * scaleY;

        // 计算字号（按比例缩放）
        // 原始字号是像素，需要转换为磅
        // 1 磅 = 1/72 英寸，在 96 DPI 下 1 磅 ≈ 1.333 像素
        const fontSizePt = Math.round(box.fontSize * scaleY * 72 / 96);

        slide.addText(box.text, {
          x,
          y,
          w,
          h,
          fontSize: Math.max(8, Math.min(fontSizePt, 72)), // 限制字号范围
          fontFace: "微软雅黑",
          color: (box.color || "333333").replace("#", ""),
          bold: !!box.bold,
          valign: "top",
          margin: 0,
          wrap: true,
        });
      }
    }

    // 3. 添加备注（讲稿）
    if (page.originalPage?.script) {
      slide.addNotes(page.originalPage.script);
    }
  }

  // 生成 PPT Blob
  const blob = await pptx.write({ outputType: "blob" }) as Blob;
  return blob;
}

// 下载可编辑 PPT 文件
export async function downloadEditablePPT(options: BuildEditablePPTOptions): Promise<void> {
  const blob = await buildEditablePPT(options);
  const fileName = `${options.title || "PPT"}-可编辑.pptx`;

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
    });

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await writeFile(filePath, bytes);
      toast.success(`可编辑 PPT 已保存到: ${filePath.split("/").pop()}`);
    }
  } catch (error) {
    console.error("保存可编辑 PPT 失败:", error);
    toast.error(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    throw error;
  }
}

// 构建仅背景 PPT 文件 - 只有去除文字后的背景图，不添加文本框
export async function buildBackgroundPPT(options: BuildEditablePPTOptions): Promise<Blob> {
  const { title, pages, aspectRatio } = options;

  // 创建 PPT 实例
  const pptx = new PptxGenJS();

  // 设置 PPT 属性
  pptx.title = title;
  pptx.author = "NextCreator";
  pptx.subject = title;

  // 设置幻灯片尺寸
  let slideWidth: number;
  let slideHeight: number;

  if (aspectRatio === "16:9") {
    slideWidth = 10;
    slideHeight = 5.625;
    pptx.defineLayout({ name: "WIDE", width: slideWidth, height: slideHeight });
    pptx.layout = "WIDE";
  } else {
    slideWidth = 10;
    slideHeight = 7.5;
    pptx.defineLayout({ name: "STANDARD", width: slideWidth, height: slideHeight });
    pptx.layout = "STANDARD";
  }

  // 遍历页面生成幻灯片
  for (const page of pages) {
    const slide = pptx.addSlide();

    // 添加背景图（去除文字后的图片）
    if (page.backgroundImage) {
      slide.addImage({
        data: `data:image/png;base64,${page.backgroundImage}`,
        x: 0,
        y: 0,
        w: slideWidth,
        h: slideHeight,
        sizing: {
          type: "cover",
          w: slideWidth,
          h: slideHeight,
        },
      });
    }

    // 添加备注（讲稿）
    if (page.originalPage?.script) {
      slide.addNotes(page.originalPage.script);
    }
  }

  // 生成 PPT Blob
  const blob = await pptx.write({ outputType: "blob" }) as Blob;
  return blob;
}

// 下载仅背景 PPT 文件
export async function downloadBackgroundPPT(options: BuildEditablePPTOptions): Promise<void> {
  const blob = await buildBackgroundPPT(options);
  const fileName = `${options.title || "PPT"}-仅背景.pptx`;

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
    });

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await writeFile(filePath, bytes);
      toast.success(`仅背景 PPT 已保存到: ${filePath.split("/").pop()}`);
    }
  } catch (error) {
    console.error("保存仅背景 PPT 失败:", error);
    toast.error(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    throw error;
  }
}

// 导出讲稿为文本文件
export async function downloadScripts(pages: PPTPageData[], title: string): Promise<void> {
  // 构建讲稿文本
  let content = `# ${title}\n\n`;
  content += `生成时间：${new Date().toLocaleString()}\n\n`;
  content += "---\n\n";

  for (const page of pages) {
    content += `## 第 ${page.pageNumber} 页：${page.heading}\n\n`;

    // 要点
    if (page.points.length > 0) {
      content += "**PPT 要点：**\n";
      page.points.forEach((point, i) => {
        content += `${i + 1}. ${point}\n`;
      });
      content += "\n";
    }

    // 讲稿
    content += "**口头讲稿：**\n";
    content += page.script || "（无讲稿）";
    content += "\n\n---\n\n";
  }

  const fileName = `${title || "PPT"}-讲稿.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "Markdown", extensions: ["md", "txt"] }],
    });

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await writeFile(filePath, bytes);
      toast.success(`讲稿已保存到: ${filePath.split("/").pop()}`);
    }
  } catch (error) {
    console.error("保存讲稿失败:", error);
    toast.error(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}
