import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Trash2 } from "lucide-react";
import { useCustomModelStore, type ModelCategory } from "@/stores/customModelStore";

export interface ModelOption {
  value: string;
  label: string;
}

interface ModelSelectorProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  /** 是否允许自定义模型输入 */
  allowCustom?: boolean;
  /** 自定义模型输入的占位符 */
  customPlaceholder?: string;
  /** 按钮样式变体 */
  variant?: "primary" | "warning" | "info";
  /** 弹窗标题 */
  title?: string;
  className?: string;
  /** 模型分类，用于保存和读取用户自定义模型 */
  modelCategory?: ModelCategory;
}

/**
 * 模型选择器组件
 * 点击后弹出 modal 选择模型，避免画布 transform 导致的渲染问题
 */
export function ModelSelector({
  value,
  options,
  onChange,
  allowCustom = true,
  customPlaceholder = "输入模型名称...",
  variant = "primary",
  title = "选择模型",
  className = "",
  modelCategory,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const customModels = useCustomModelStore((state) =>
    modelCategory ? state.getCustomModels(modelCategory) : []
  );

  // 检查是否是自定义模型（不在预设列表中）
  const isCustomModel = !options.some((opt) => opt.value === value);

  // 获取显示的模型名称（包含真实模型名）
  const getDisplayName = () => {
    const preset = options.find((opt) => opt.value === value);
    if (preset) {
      // 如果 label 和 value 相同，只显示一个
      return preset.label === preset.value ? preset.label : `${preset.label} (${preset.value})`;
    }
    return value;
  };

  // 打开弹窗
  const openModal = () => setIsOpen(true);

  // 处理选择
  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className={`${className}`} onPointerDown={(e) => e.stopPropagation()}>
      <label className="text-xs text-base-content/60 mb-0.5 block">模型</label>
      <button
        type="button"
        className="w-full flex items-center justify-between px-2 py-1.5 bg-base-200 hover:bg-base-300 rounded-lg text-xs transition-colors border border-base-300"
        onClick={openModal}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className={isCustomModel ? "text-primary font-medium truncate" : "truncate"}>
          {getDisplayName()}
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {/* Modal 弹窗 */}
      {isOpen && (
        <ModelSelectorModal
          value={value}
          options={options}
          onChange={handleSelect}
          onClose={() => setIsOpen(false)}
          allowCustom={allowCustom}
          customPlaceholder={customPlaceholder}
          variant={variant}
          title={title}
          modelCategory={modelCategory}
          customModels={customModels}
        />
      )}
    </div>
  );
}

// Modal 弹窗组件
interface ModelSelectorModalProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  onClose: () => void;
  allowCustom: boolean;
  customPlaceholder: string;
  variant: "primary" | "warning" | "info";
  title: string;
  modelCategory?: ModelCategory;
  customModels: string[];
}

function ModelSelectorModal({
  value,
  options,
  onChange,
  onClose,
  allowCustom,
  customPlaceholder,
  variant,
  title,
  modelCategory,
  customModels,
}: ModelSelectorModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const { addCustomModel, removeCustomModel } = useCustomModelStore();

  // 检查是否是自定义模型（不在预设列表中，也不在用户自定义列表中）
  const isCustomModel = !options.some((opt) => opt.value === value) && !customModels.includes(value);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // 选择预设模型
  const handleSelectPreset = (modelValue: string) => {
    onChange(modelValue);
  };

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (trimmed) {
      // 保存到自定义模型列表（如果指定了分类）
      if (modelCategory) {
        addCustomModel(modelCategory, trimmed);
      }
      onChange(trimmed);
    }
  };

  // 删除用户自定义模型
  const handleRemoveCustomModel = (model: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (modelCategory) {
      removeCustomModel(modelCategory, model);
      // 如果删除的是当前选中的模型，不做任何处理，让用户重新选择
    }
  };

  // 获取选中状态的背景色
  const getSelectedBg = () => {
    switch (variant) {
      case "warning":
        return "bg-warning/20 text-warning border border-warning/30";
      case "info":
        return "bg-info/20 text-info border border-info/30";
      default:
        return "bg-primary/20 text-primary border border-primary/30";
    }
  };

  // 获取按钮主题色
  const getButtonTheme = () => {
    switch (variant) {
      case "warning":
        return "btn-warning";
      case "info":
        return "btn-info";
      default:
        return "btn-primary";
    }
  };

  // 获取头部渐变色
  const getHeaderGradient = () => {
    switch (variant) {
      case "warning":
        return "bg-gradient-to-r from-amber-500 to-orange-500";
      case "info":
        return "bg-gradient-to-r from-cyan-500 to-blue-500";
      default:
        return "bg-gradient-to-r from-purple-500 to-pink-500";
    }
  };

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center p-4
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/60" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          w-full max-w-xs bg-base-100 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`flex items-center justify-between px-4 py-3 ${getHeaderGradient()}`}>
          <span className="text-sm font-medium text-white">{title}</span>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* 预设模型列表 */}
          <div className="space-y-1">
            <label className="text-xs text-base-content/60 mb-1.5 block">预设模型</label>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`
                  w-full px-3 py-2 text-left text-sm rounded-lg
                  flex items-center justify-between
                  transition-colors
                  ${value === opt.value
                    ? getSelectedBg()
                    : "bg-base-200 hover:bg-base-300"
                  }
                `}
                onClick={() => handleSelectPreset(opt.value)}
              >
                <span className="flex flex-col items-start">
                  <span>{opt.label}</span>
                  {opt.label !== opt.value && (
                    <span className="text-xs text-base-content/50">{opt.value}</span>
                  )}
                </span>
                {value === opt.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* 用户自定义模型列表 */}
          {allowCustom && customModels.length > 0 && (
            <div className="border-t border-base-300 pt-3 space-y-1">
              <label className="text-xs text-base-content/60 mb-1.5 block">我的模型</label>
              {customModels.map((model) => (
                <div
                  key={model}
                  className={`
                    w-full px-3 py-2 text-left text-sm rounded-lg
                    flex items-center justify-between group
                    transition-colors cursor-pointer
                    ${value === model
                      ? getSelectedBg()
                      : "bg-base-200 hover:bg-base-300"
                    }
                  `}
                  onClick={() => handleSelectPreset(model)}
                >
                  <span className="truncate">{model}</span>
                  <div className="flex items-center gap-1">
                    {value === model && <Check className="w-4 h-4" />}
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-error/20 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveCustomModel(model, e)}
                      title="删除此模型"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 自定义模型输入 */}
          {allowCustom && (
            <>
              <div className="border-t border-base-300 pt-3">
                <label className="text-xs text-base-content/60 mb-1.5 block">添加自定义模型</label>
                {/* 当前自定义模型显示（如果是临时输入的，不在列表中） */}
                {isCustomModel && value && (
                  <div className="mb-2 px-2 py-1.5 bg-primary/10 rounded-lg text-xs text-primary">
                    当前: {value}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-sm input-bordered flex-1"
                    placeholder={customPlaceholder}
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCustomModelSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`btn btn-sm ${getButtonTheme()}`}
                    onClick={handleCustomModelSubmit}
                    disabled={!customModel.trim()}
                  >
                    添加
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end px-4 py-3 bg-base-200/50 border-t border-base-300">
          <span className="text-xs text-base-content/50 mr-auto">
            按 ESC 关闭
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
