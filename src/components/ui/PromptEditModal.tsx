import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Zap, ImagePlus, ChevronDown, Check, Upload, Trash2, Tag, Eye } from "lucide-react";
import type { PromptNodeTemplate } from "@/config/promptConfig";
import type { UserPrompt, CreatePromptInput } from "@/stores/userPromptStore";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";

interface PromptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreatePromptInput) => void;
  editingPrompt?: UserPrompt | null;
}

// 基础宽高比选项（Fast 模型 - 5 个）
const basicAspectRatioOptions = [
  { value: "1:1", label: "1:1 正方形" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "9:16", label: "9:16 竖屏" },
  { value: "4:3", label: "4:3 标准" },
  { value: "3:4", label: "3:4 竖版" },
] as const;

// Pro 宽高比选项（Pro 模型 - 10 个）
const proAspectRatioOptions = [
  { value: "1:1", label: "1:1 正方形" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "9:16", label: "9:16 竖屏" },
  { value: "4:3", label: "4:3 标准" },
  { value: "3:4", label: "3:4 竖版" },
  { value: "3:2", label: "3:2 照片" },
  { value: "2:3", label: "2:3 海报" },
  { value: "5:4", label: "5:4 横向" },
  { value: "4:5", label: "4:5 竖向" },
  { value: "21:9", label: "21:9 超宽" },
] as const;

export function PromptEditModal({
  isOpen,
  onClose,
  onSave,
  editingPrompt,
}: PromptEditModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(true);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);
  const [requiresImageInput, setRequiresImageInput] = useState(false);
  const [generatorType, setGeneratorType] = useState<"pro" | "fast">("fast");
  const [aspectRatio, setAspectRatio] = useState<PromptNodeTemplate["aspectRatio"]>("1:1");

  // 初始化/重置表单
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setIsAnimatingIn(true);
      setIsImagePreviewOpen(false); // 重置图片预览状态

      // 触发入场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(false);
        });
      });

      if (editingPrompt) {
        setTitle(editingPrompt.title);
        setDescription(editingPrompt.description);
        setPrompt(editingPrompt.prompt);
        setTags(editingPrompt.tags || []);
        setTagInput("");
        setPreviewImage(editingPrompt.previewImage);
        setRequiresImageInput(editingPrompt.nodeTemplate.requiresImageInput);
        setGeneratorType(editingPrompt.nodeTemplate.generatorType);
        setAspectRatio(editingPrompt.nodeTemplate.aspectRatio);
      } else {
        // 重置为默认值
        setTitle("");
        setDescription("");
        setPrompt("");
        setTags([]);
        setTagInput("");
        setPreviewImage(undefined);
        setRequiresImageInput(false);
        setGeneratorType("fast");
        setAspectRatio("1:1");
      }
    }
  }, [isOpen, editingPrompt]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // 根据生成器类型选择宽高比选项
  const aspectRatioOptions = generatorType === "pro" ? proAspectRatioOptions : basicAspectRatioOptions;

  // 切换生成器类型时，检查并调整宽高比
  const handleGeneratorTypeChange = useCallback((type: "pro" | "fast") => {
    setGeneratorType(type);

    // 如果切换到 Fast，但当前宽高比不在 Fast 支持的选项中，重置为 1:1
    if (type === "fast") {
      const supportedValues = basicAspectRatioOptions.map(o => o.value);
      if (!supportedValues.includes(aspectRatio as any)) {
        setAspectRatio("1:1");
      }
    }
  }, [aspectRatio]);

  // 处理图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      return;
    }

    // 读取为 base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 清空 input 以便可以重复选择同一文件
    e.target.value = "";
  }, []);

  // 处理标签输入
  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const newTag = tagInput.trim().replace(/,/g, "");
        if (newTag && !tags.includes(newTag) && tags.length < 5) {
          setTags([...tags, newTag]);
          setTagInput("");
        }
      } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
        // 删除最后一个标签
        setTags(tags.slice(0, -1));
      }
    },
    [tagInput, tags]
  );

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim() || !prompt.trim()) return;

      onSave({
        title: title.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        tags,
        previewImage,
        nodeTemplate: {
          requiresImageInput,
          generatorType,
          aspectRatio,
        },
      });

      handleClose();
    },
    [title, description, prompt, tags, previewImage, requiresImageInput, generatorType, aspectRatio, onSave, handleClose]
  );

  const isValid = title.trim() && prompt.trim();

  if (!isVisible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* 背景遮罩 - 与整体动画同步 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimatingIn || isClosing ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Modal 内容 */}
      <div
        className={`relative w-full max-w-lg max-h-[90vh] bg-base-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ease-out ${
          isAnimatingIn
            ? "scale-95 opacity-0 translate-y-4"
            : isClosing
              ? "scale-95 opacity-0"
              : "scale-100 opacity-100 translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <h2 className="text-lg font-bold">
            {editingPrompt ? "编辑提示词" : "新建提示词"}
          </h2>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 标题 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">
                标题 <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="给提示词起个名字"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* 描述 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">描述</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="简单描述这个提示词的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 标签 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">标签</span>
              <span className="label-text-alt text-base-content/50">最多 5 个</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[2.5rem] bg-base-100 border border-base-300 rounded-lg focus-within:border-primary focus-within:outline focus-within:outline-2 focus-within:outline-primary/20">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    type="button"
                    className="hover:text-error transition-colors"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  className="flex-1 min-w-[80px] bg-transparent text-sm outline-none"
                  placeholder={tags.length === 0 ? "输入标签后按回车添加" : ""}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                />
              )}
            </div>
          </div>

          {/* 提示词内容 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">
                提示词内容 <span className="text-error">*</span>
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full text-sm leading-relaxed"
              placeholder="输入提示词内容..."
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* 效果预览图 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">效果预览图</span>
              <span className="label-text-alt text-base-content/50">可选</span>
            </label>
            {previewImage ? (
              <div className="relative group">
                <img
                  src={previewImage}
                  alt="预览图"
                  className="w-full h-32 object-cover rounded-lg border border-base-300"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-white"
                    onClick={() => setIsImagePreviewOpen(true)}
                  >
                    <Eye className="w-4 h-4" />
                    预览
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    更换
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-error"
                    onClick={() => setPreviewImage(undefined)}
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full border border-dashed border-base-300 h-20 flex-col gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-base-content/40" />
                <span className="text-xs text-base-content/50">点击上传预览图</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* 节点模板配置 */}
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium text-base-content/70">节点配置</div>

            {/* 生成器类型 */}
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 btn btn-sm gap-2 ${
                  generatorType === "fast"
                    ? "btn-warning"
                    : "btn-ghost border-base-300"
                }`}
                onClick={() => handleGeneratorTypeChange("fast")}
              >
                <Zap className="w-4 h-4" />
                Fast 模型
              </button>
              <button
                type="button"
                className={`flex-1 btn btn-sm gap-2 ${
                  generatorType === "pro"
                    ? "btn-secondary"
                    : "btn-ghost border-base-300"
                }`}
                onClick={() => handleGeneratorTypeChange("pro")}
              >
                <Sparkles className="w-4 h-4" />
                Pro 模型
              </button>
            </div>

            {/* 是否需要图片输入 */}
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200 transition-colors">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={requiresImageInput}
                onChange={(e) => setRequiresImageInput(e.target.checked)}
              />
              <div className="flex items-center gap-2 flex-1">
                <ImagePlus className="w-4 h-4 text-base-content/60" />
                <span className="text-sm">需要图片输入</span>
              </div>
            </label>

            {/* 宽高比 */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">默认宽高比</span>
              </label>
              <div className="dropdown dropdown-top dropdown-end w-full">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-sm w-full justify-between font-normal border-base-300 bg-base-100"
                >
                  <span>{aspectRatioOptions.find((o) => o.value === aspectRatio)?.label}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-10 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-full"
                >
                  {aspectRatioOptions.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        className={`flex justify-between ${aspectRatio === opt.value ? "active" : ""}`}
                        onClick={() => {
                          setAspectRatio(opt.value as PromptNodeTemplate["aspectRatio"]);
                          // 关闭 dropdown
                          (document.activeElement as HTMLElement)?.blur();
                        }}
                      >
                        {opt.label}
                        {aspectRatio === opt.value && <Check className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </form>

        {/* 底部操作 */}
        <div className="p-4 border-t border-base-200 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {editingPrompt ? "保存" : "创建"}
          </button>
        </div>
      </div>

      {/* 图片预览 Modal */}
      {isImagePreviewOpen && previewImage && (
        <ImagePreviewModal
          imageData={previewImage.replace(/^data:image\/\w+;base64,/, "")}
          onClose={() => setIsImagePreviewOpen(false)}
          fileName="preview.png"
        />
      )}
    </div>,
    document.body
  );
}
