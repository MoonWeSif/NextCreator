import {
  Camera,
  Sparkles,
  GraduationCap,
  ShoppingBag,
  Briefcase,
  ImagePlus,
  Home,
  Megaphone,
  Globe,
  User,
} from "lucide-react";
import type { ImageGenerationParams } from "@/types";
import {
  photorealismCategory,
  creativeCategory,
  educationCategory,
  ecommerceCategory,
  workplaceCategory,
  photoEditingCategory,
  interiorCategory,
  socialMediaCategory,
  translationCategory,
  avatarsCategory,
} from "./prompts";

// 节点模板配置 - 定义拖拽到画布时创建的节点组合
export interface PromptNodeTemplate {
  requiresImageInput: boolean;  // 是否需要图片输入节点
  generatorType: "pro" | "fast"; // 使用哪个生成器
  aspectRatio: ImageGenerationParams["aspectRatio"]; // 默认宽高比
}

// 提示词分类定义
export interface PromptCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  prompts: PromptItem[];
}

// 单个提示词定义
export interface PromptItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  prompt: string;
  tags: string[];
  source?: string;
  previewImage?: string; // 预览图 URL
  nodeTemplate: PromptNodeTemplate; // 节点模板配置
}

// 提示词分类配置
export const promptCategories: PromptCategory[] = [
  photorealismCategory,
  creativeCategory,
  educationCategory,
  ecommerceCategory,
  workplaceCategory,
  photoEditingCategory,
  interiorCategory,
  socialMediaCategory,
  translationCategory,
  avatarsCategory,
];

// 图标映射
export const promptIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera,
  Sparkles,
  GraduationCap,
  ShoppingBag,
  Briefcase,
  ImagePlus,
  Home,
  Megaphone,
  Globe,
  User,
};

// 图标颜色映射
export const promptIconColors: Record<string, string> = {
  Camera: "bg-rose-500/10 text-rose-500",
  Sparkles: "bg-purple-500/10 text-purple-500",
  GraduationCap: "bg-blue-500/10 text-blue-500",
  ShoppingBag: "bg-amber-500/10 text-amber-500",
  Briefcase: "bg-slate-500/10 text-slate-500",
  ImagePlus: "bg-green-500/10 text-green-500",
  Home: "bg-orange-500/10 text-orange-500",
  Megaphone: "bg-pink-500/10 text-pink-500",
  Globe: "bg-cyan-500/10 text-cyan-500",
  User: "bg-indigo-500/10 text-indigo-500",
};
