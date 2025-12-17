import { useRef, useState } from "react";
import { Settings, FileText, AlignLeft, StickyNote, Cpu, ChevronDown, Check, Image } from "lucide-react";
import type { PPTContentNodeData, PageCountRange, DetailLevel } from "./types";
import { IMAGE_PRESET_MODELS } from "./types";
import { useLLMPresetModels } from "@/config/presetModels";

interface ConfigTabProps {
  config: PPTContentNodeData["outlineConfig"];
  outlineModel: string;
  imageModel: string;
  onChange: (config: Partial<PPTContentNodeData["outlineConfig"]>) => void;
  onModelChange: (model: string) => void;
  onImageModelChange: (model: string) => void;
}

// 页数范围选项
const pageCountOptions: { value: PageCountRange; label: string }[] = [
  { value: "5-8", label: "5-8 页" },
  { value: "8-12", label: "8-12 页" },
  { value: "12-15", label: "12-15 页" },
  { value: "custom", label: "自定义" },
];

// 详细程度选项
const detailLevelOptions: { value: DetailLevel; label: string; desc: string }[] = [
  { value: "concise", label: "简洁", desc: "要点精炼，讲稿简短" },
  { value: "moderate", label: "适中", desc: "要点完整，讲稿适中" },
  { value: "detailed", label: "详细", desc: "要点丰富，讲稿详细" },
];

export function ConfigTab({ config, outlineModel, imageModel, onChange, onModelChange, onImageModelChange }: ConfigTabProps) {
  // IME 输入处理
  const isComposingRef = useRef(false);
  // 模型下拉菜单状态
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [customModel, setCustomModel] = useState("");
  // 图片生成模型下拉菜单状态
  const [showImageModelDropdown, setShowImageModelDropdown] = useState(false);
  const [customImageModel, setCustomImageModel] = useState("");

  // 获取当前供应商的预设 LLM 模型列表（用于大纲生成）
  const { presetModels: outlinePresetModels } = useLLMPresetModels("llm");

  // 检查是否是自定义模型
  const isCustomModel = !outlinePresetModels.some((m) => m.value === outlineModel);

  // 获取显示的模型名称
  const getDisplayModelName = () => {
    const preset = outlinePresetModels.find((m) => m.value === outlineModel);
    return preset ? preset.label : outlineModel;
  };

  // 选择预设模型
  const handleSelectModel = (value: string) => {
    onModelChange(value);
    setShowModelDropdown(false);
    setCustomModel("");
  };

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    if (customModel.trim()) {
      onModelChange(customModel.trim());
      setShowModelDropdown(false);
    }
  };

  // 检查是否是自定义图片模型
  const isCustomImageModel = !IMAGE_PRESET_MODELS.some((m) => m.value === imageModel);

  // 获取显示的图片模型名称
  const getDisplayImageModelName = () => {
    const preset = IMAGE_PRESET_MODELS.find((m) => m.value === imageModel);
    return preset ? preset.label : imageModel;
  };

  // 选择预设图片模型
  const handleSelectImageModel = (value: string) => {
    onImageModelChange(value);
    setShowImageModelDropdown(false);
    setCustomImageModel("");
  };

  // 使用自定义图片模型
  const handleCustomImageModelSubmit = () => {
    if (customImageModel.trim()) {
      onImageModelChange(customImageModel.trim());
      setShowImageModelDropdown(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 页数范围 */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/70 mb-2">
          <FileText className="w-3.5 h-3.5" />
          PPT 页数
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {pageCountOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                btn btn-sm h-9 px-3 text-xs font-normal nopan nodrag
                ${config.pageCountRange === option.value
                  ? "btn-primary"
                  : "btn-ghost bg-base-200 hover:bg-base-300"
                }
              `}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ pageCountRange: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {/* 自定义页数输入 */}
        {config.pageCountRange === "custom" && (
          <div className="mt-2">
            <input
              type="number"
              className="input input-bordered input-sm w-full"
              placeholder="输入页数（如：10）"
              value={config.customPageCount || ""}
              min={3}
              max={30}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 3 && value <= 30) {
                  onChange({ customPageCount: value });
                } else if (e.target.value === "") {
                  onChange({ customPageCount: undefined });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 详细程度 */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/70 mb-2">
          <AlignLeft className="w-3.5 h-3.5" />
          详细程度
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {detailLevelOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`
                btn btn-sm h-auto py-2 px-2 flex flex-col items-center gap-0.5 nopan nodrag
                ${config.detailLevel === option.value
                  ? "btn-primary"
                  : "btn-ghost bg-base-200 hover:bg-base-300"
                }
              `}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ detailLevel: option.value });
              }}
            >
              <span className="text-xs font-medium">{option.label}</span>
              <span className={`text-xs ${config.detailLevel === option.value ? "opacity-70" : "opacity-60"}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 自由补充框 */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/70 mb-2">
          <StickyNote className="w-3.5 h-3.5" />
          补充说明（可选）
        </label>
        <textarea
          className="textarea textarea-bordered w-full min-h-[80px] text-sm resize-none nopan nodrag"
          placeholder={`输入额外的要求或说明，例如：\n• 重点强调技术创新点\n• 需要包含实验对比数据`}
          value={config.additionalNotes}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (!isComposingRef.current) {
              onChange({ additionalNotes: e.target.value });
            }
          }}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            onChange({ additionalNotes: e.currentTarget.value });
          }}
        />
      </div>

      {/* 大纲生成模型选择 */}
      <div className="relative">
        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/70 mb-2">
          <Cpu className="w-3.5 h-3.5" />
          大纲生成模型
        </label>
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 bg-base-200 hover:bg-base-300 rounded-lg text-sm transition-colors border border-base-300 nopan nodrag"
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className={isCustomModel ? "text-primary font-medium" : ""}>
            {getDisplayModelName()}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
        </button>

        {/* 下拉菜单 */}
        {showModelDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl overflow-hidden">
            {/* 预设模型 */}
            {outlinePresetModels.map((model) => (
              <button
                key={model.value}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-base-200 transition-colors flex items-center justify-between nopan nodrag ${
                  outlineModel === model.value ? "bg-primary/10 text-primary" : ""
                }`}
                onClick={() => handleSelectModel(model.value)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span>{model.label}</span>
                {outlineModel === model.value && <Check className="w-4 h-4" />}
              </button>
            ))}

            {/* 分隔线 */}
            <div className="border-t border-base-300 my-1" />

            {/* 自定义模型输入 */}
            <div className="p-2">
              <label className="text-xs text-base-content/60 mb-1 block">自定义模型</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="input input-sm input-bordered flex-1 text-sm nopan nodrag"
                  placeholder="输入模型名称..."
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomModelSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary nopan nodrag"
                  onClick={handleCustomModelSubmit}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={!customModel.trim()}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 页面图片生成模型选择 */}
      <div className="relative">
        <label className="flex items-center gap-1.5 text-xs font-medium text-base-content/70 mb-2">
          <Image className="w-3.5 h-3.5" />
          页面图片生成模型
        </label>
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 bg-base-200 hover:bg-base-300 rounded-lg text-sm transition-colors border border-base-300 nopan nodrag"
          onClick={() => setShowImageModelDropdown(!showImageModelDropdown)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className={isCustomImageModel ? "text-primary font-medium" : ""}>
            {getDisplayImageModelName()}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showImageModelDropdown ? "rotate-180" : ""}`} />
        </button>

        {/* 下拉菜单 */}
        {showImageModelDropdown && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl overflow-hidden">
            {/* 预设模型 */}
            {IMAGE_PRESET_MODELS.map((model) => (
              <button
                key={model.value}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-base-200 transition-colors flex items-center justify-between nopan nodrag ${
                  imageModel === model.value ? "bg-primary/10 text-primary" : ""
                }`}
                onClick={() => handleSelectImageModel(model.value)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span>{model.label}</span>
                {imageModel === model.value && <Check className="w-4 h-4" />}
              </button>
            ))}

            {/* 分隔线 */}
            <div className="border-t border-base-300 my-1" />

            {/* 自定义模型输入 */}
            <div className="p-2">
              <label className="text-xs text-base-content/60 mb-1 block">自定义模型</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="input input-sm input-bordered flex-1 text-sm nopan nodrag"
                  placeholder="输入模型名称..."
                  value={customImageModel}
                  onChange={(e) => setCustomImageModel(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCustomImageModelSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary nopan nodrag"
                  onClick={handleCustomImageModelSubmit}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={!customImageModel.trim()}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 配置摘要提示 */}
      <div className="bg-base-200 rounded-lg p-3 text-xs">
        <div className="flex items-start gap-2">
          <Settings className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
          <div>
            <p className="font-medium mb-1">当前配置</p>
            <p className="opacity-60">
              将生成约 {config.pageCountRange === "custom" ? (config.customPageCount || 8) : config.pageCountRange.replace("-", "-")} 页，
              {detailLevelOptions.find(o => o.value === config.detailLevel)?.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
