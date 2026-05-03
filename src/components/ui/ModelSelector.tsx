import { useState, useCallback, useEffect, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Trash2, Search, Plus } from "lucide-react";
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
  /** 展示方式：modal 适合画布节点，inline 适合右侧 Inspector */
  mode?: "modal" | "inline";
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
  customPlaceholder = "搜索或输入模型名称",
  variant = "primary",
  title = "选择模型",
  className = "",
  modelCategory,
  mode = "modal",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const customModels = useCustomModelStore((state) =>
    modelCategory ? state.getCustomModels(modelCategory) : []
  );

  const selectedPreset = options.find((opt) => opt.value === value);
  // 检查是否是自定义模型（不在预设列表中）
  const isCustomModel = Boolean(value) && !selectedPreset;
  const compactDisplayName = selectedPreset
    ? selectedPreset.label === selectedPreset.value
      ? selectedPreset.label
      : `${selectedPreset.label} (${selectedPreset.value})`
    : value || "选择模型";
  const inlineDisplayLabel = selectedPreset?.label || value || "选择模型";
  const inlineDisplayMeta = selectedPreset && selectedPreset.label !== selectedPreset.value
    ? selectedPreset.value
    : isCustomModel
      ? "自定义模型"
      : "";
  const accentTextClass = getAccentTextClass(variant);

  // 处理选择
  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  useEffect(() => {
    if (mode !== "inline" || !isOpen) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, mode]);

  return (
    <div
      ref={containerRef}
      className={`nc-model-selector nc-model-selector-${variant} relative ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <label className="mb-1 block text-xs text-base-content/60">模型</label>
      <button
        type="button"
        className={`
          nc-model-selector-trigger w-full rounded-lg border text-left
          ${mode === "inline"
            ? "flex min-h-[56px] items-center justify-between gap-3 bg-base-100 px-3 py-2.5 hover:bg-base-200/35"
            : "flex items-center justify-between gap-2 bg-base-200/70 px-2 py-1.5 text-xs hover:bg-base-200"
          }
          ${isOpen ? `nc-model-selector-trigger-open bg-base-100 ${getOpenStateClass(variant)}` : "border-base-300/70"}
        `}
        onClick={() => setIsOpen((open) => !open)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className={`block ${mode === "inline" ? "line-clamp-2 leading-5" : "truncate"} ${isCustomModel ? `${accentTextClass} font-medium` : "text-base-content"}`}>
            {mode === "inline" ? inlineDisplayLabel : compactDisplayName}
          </span>
          {mode === "inline" && inlineDisplayMeta && (
            <span className="mt-1 block break-all text-[11px] leading-4 text-base-content/45">
              {inlineDisplayMeta}
            </span>
          )}
        </span>
        <span className={`nc-model-selector-chevron-shell flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-base-300/70 bg-base-200/40 ${isOpen ? `${accentTextClass} shadow-[0_1px_8px_rgba(15,23,42,0.08)]` : "text-base-content/45"}`}>
          <ChevronDown className={`nc-model-selector-chevron h-3.5 w-3.5 ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && mode === "modal" && (
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
      {isOpen && mode === "inline" && (
        <ModelSelectorDropdown
          value={value}
          options={options}
          onChange={handleSelect}
          allowCustom={allowCustom}
          customPlaceholder={customPlaceholder}
          variant={variant}
          modelCategory={modelCategory}
          customModels={customModels}
        />
      )}
    </div>
  );
}

interface ModelSelectorDropdownProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  allowCustom: boolean;
  customPlaceholder: string;
  variant: "primary" | "warning" | "info";
  modelCategory?: ModelCategory;
  customModels: string[];
}

function getSelectedBgClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "bg-warning/10 text-warning border-warning/25";
    case "info":
      return "bg-info/10 text-info border-info/25";
    default:
      return "bg-primary/10 text-primary border-primary/25";
  }
}

function getOpenStateClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "border-warning/45 shadow-[0_0_0_3px_hsl(var(--wa)/0.12)]";
    case "info":
      return "border-info/45 shadow-[0_0_0_3px_hsl(var(--in)/0.12)]";
    default:
      return "border-primary/45 shadow-[0_0_0_3px_hsl(var(--p)/0.12)]";
  }
}

function getAccentTextClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
    default:
      return "text-primary";
  }
}

function getAccentSoftClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "nc-model-selector-add-option bg-warning/10 text-warning border-warning/20 hover:bg-warning/20";
    case "info":
      return "nc-model-selector-add-option bg-info/10 text-info border-info/20 hover:bg-info/20";
    default:
      return "nc-model-selector-add-option bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
  }
}

function modelMatchesQuery(label: string, value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${label} ${value}`.toLowerCase().includes(normalizedQuery);
}

function getOptionAnimationStyle(index: number): CSSProperties {
  return { "--nc-model-option-delay": `${Math.min(Math.max(index, 0) * 28, 168)}ms` } as CSSProperties;
}

function ModelSelectorDropdown({
  value,
  options,
  onChange,
  allowCustom,
  customPlaceholder,
  variant,
  modelCategory,
  customModels,
}: ModelSelectorDropdownProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addCustomModel, removeCustomModel } = useCustomModelStore();
  const isCustomModel = !options.some((opt) => opt.value === value) && !customModels.includes(value);
  const trimmedQuery = query.trim();
  const filteredOptions = options.filter((opt) => modelMatchesQuery(opt.label, opt.value, query));
  const filteredCustomModels = customModels.filter((model) => modelMatchesQuery(model, model, query));
  const exactMatchExists = [...options.map((opt) => opt.value), ...customModels].some(
    (model) => model.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const canAddQuery = allowCustom && trimmedQuery.length > 0 && !exactMatchExists;
  const hasResults = filteredOptions.length > 0 || filteredCustomModels.length > 0 || canAddQuery;
  const selectedClassName = getSelectedBgClass(variant);
  const addOptionClassName = getAccentSoftClass(variant);

  const handleCustomModelSubmit = (modelName = query) => {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    if (modelCategory) {
      addCustomModel(modelCategory, trimmed);
    }
    onChange(trimmed);
  };

  const handleRemoveCustomModel = (model: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (modelCategory) {
      removeCustomModel(modelCategory, model);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstMatch = filteredOptions[0]?.value || filteredCustomModels[0];
    if (firstMatch) {
      onChange(firstMatch);
      return;
    }
    if (canAddQuery) {
      handleCustomModelSubmit(trimmedQuery);
    }
  };

  const renderPresetOption = (opt: ModelOption) => {
    const selected = value === opt.value;
    const optionIndex = filteredOptions.findIndex((item) => item.value === opt.value);

    return (
      <button
        key={opt.value}
        type="button"
        style={getOptionAnimationStyle(optionIndex)}
        className={`
          nc-model-selector-option flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm
          ${selected
            ? `nc-model-selector-option-selected ${selectedClassName} shadow-[0_1px_10px_rgba(15,23,42,0.06)]`
            : "border-transparent bg-transparent text-base-content hover:border-base-300/45 hover:bg-base-200/55 hover:shadow-[0_1px_8px_rgba(15,23,42,0.04)]"
          }
        `}
        onClick={() => onChange(opt.value)}
      >
        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 font-medium leading-5">{opt.label}</span>
          {opt.label !== opt.value && (
            <span className="mt-1 block break-all text-[11px] leading-4 text-base-content/45">
              {opt.value}
            </span>
          )}
        </span>
        {selected && <Check className="nc-model-selector-check mt-0.5 h-4 w-4 flex-shrink-0" />}
      </button>
    );
  };

  const renderCustomOption = (model: string) => {
    const selected = value === model;
    const optionIndex = filteredOptions.length + filteredCustomModels.findIndex((item) => item === model);

    return (
      <div
        key={model}
        style={getOptionAnimationStyle(optionIndex)}
        className={`
          nc-model-selector-option group flex w-full items-center rounded-lg border text-sm
          ${selected
            ? `nc-model-selector-option-selected ${selectedClassName} shadow-[0_1px_10px_rgba(15,23,42,0.06)]`
            : "border-transparent bg-transparent text-base-content hover:border-base-300/45 hover:bg-base-200/55 hover:shadow-[0_1px_8px_rgba(15,23,42,0.04)]"
          }
        `}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => onChange(model)}
        >
          <span className="min-w-0 flex-1">
            <span className="block break-all font-medium leading-5">{model}</span>
            <span className="mt-1 block text-[11px] leading-4 text-base-content/45">
              自定义模型
            </span>
          </span>
          {selected && <Check className="nc-model-selector-check h-4 w-4" />}
        </button>
        <span className="flex flex-shrink-0 items-center pr-1.5">
          <button
            type="button"
            className="
              rounded p-1 text-base-content/40 opacity-0 transition-[background-color,color,opacity] duration-150 ease-out
              hover:bg-error/15 hover:text-error group-hover:opacity-100 focus:opacity-100
            "
            onClick={(event) => handleRemoveCustomModel(model, event)}
            title="删除此模型"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  };

  return (
    <div
      className="nc-model-selector-dropdown absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-lg border border-base-300/80 bg-base-100 shadow-[0_18px_44px_rgba(15,23,42,0.16)]"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-base-300/70 bg-base-200/20 p-2.5">
        <div className="nc-model-selector-search group/search flex items-center gap-2 rounded-lg border border-base-300/70 bg-base-100 px-2.5 py-2 focus-within:border-primary/35 focus-within:shadow-[0_0_0_3px_hsl(var(--p)/0.08)]">
          <Search className="nc-model-selector-search-icon h-3.5 w-3.5 flex-shrink-0 text-base-content/35 group-focus-within/search:text-primary/55" />
          <input
            ref={searchInputRef}
            type="text"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/35 focus:outline-none focus-visible:outline-none"
            placeholder={allowCustom ? customPlaceholder : "搜索模型"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {query && (
            <button
              type="button"
              className="nc-model-selector-clear rounded p-0.5 text-base-content/35 hover:bg-base-200 hover:text-base-content/60"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="nc-scrollbar-none max-h-[360px] overflow-y-auto p-2">
        {isCustomModel && value && (
          <button
            type="button"
            style={getOptionAnimationStyle(0)}
            className={`nc-model-selector-option nc-model-selector-option-selected mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm ${selectedClassName}`}
            onClick={() => onChange(value)}
          >
            <span className="min-w-0 flex-1">
              <span className="block break-all font-medium leading-5">{value}</span>
              <span className="mt-0.5 block text-[11px] leading-4 opacity-70">
                当前自定义模型
              </span>
            </span>
            <Check className="nc-model-selector-check h-4 w-4 flex-shrink-0" />
          </button>
        )}

        {filteredOptions.length > 0 && (
          <div className="space-y-1">
            <div className="px-1.5 pb-1 pt-0.5 text-[11px] font-medium text-base-content/45">推荐模型</div>
            {filteredOptions.map(renderPresetOption)}
          </div>
        )}

        {allowCustom && filteredCustomModels.length > 0 && (
          <div className="mt-2 border-t border-base-300/70 pt-2">
            <div className="px-1.5 pb-1 text-[11px] font-medium text-base-content/45">我的模型</div>
            {filteredCustomModels.map(renderCustomOption)}
          </div>
        )}

        {canAddQuery && (
          <div className={filteredOptions.length > 0 || filteredCustomModels.length > 0 ? "mt-2 border-t border-base-300/70 pt-2" : ""}>
            <button
              type="button"
              style={getOptionAnimationStyle(filteredOptions.length + filteredCustomModels.length)}
              className={`nc-model-selector-option flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm hover:shadow-[0_1px_8px_rgba(15,23,42,0.04)] ${addOptionClassName}`}
              onClick={() => handleCustomModelSubmit(trimmedQuery)}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block break-all font-medium leading-5">添加 {trimmedQuery}</span>
              </span>
            </button>
          </div>
        )}

        {!hasResults && (
          <div className="px-3 py-6 text-center text-xs text-base-content/45">
            没有匹配的模型
          </div>
        )}

        {allowCustom && !trimmedQuery && customModels.length === 0 && filteredOptions.length > 0 && (
          <div className="mt-2 border-t border-base-300/70 px-1.5 pt-2 text-[11px] text-base-content/35">
            可直接输入兼容模型名称
          </div>
        )}
      </div>
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

  const getHeaderAccent = () => {
    switch (variant) {
      case "warning":
        return "nc-node-accent-orange";
      case "info":
        return "nc-node-accent-cyan";
      default:
        return "nc-node-accent-blue";
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
          nc-panel w-full max-w-xs rounded-2xl overflow-hidden
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`nc-node-header nc-node-header-accent px-4 py-3 ${getHeaderAccent()}`}>
          <span className="text-sm font-semibold">{title}</span>
          <button
            className="btn btn-circle btn-ghost btn-sm"
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
