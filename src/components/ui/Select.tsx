import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** 尺寸：默认 "sm"，"xs" 为更紧凑的版本 */
  size?: "sm" | "xs";
  /** 是否通过 Portal 渲染到 body；在普通侧栏内可关闭，避免额外合成层 */
  usePortal?: boolean;
}

function getOptionAnimationStyle(index: number): CSSProperties {
  return { "--nc-model-option-delay": `${Math.min(Math.max(index, 0) * 24, 144)}ms` } as CSSProperties;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "请选择",
  className = "",
  size = "sm",
  usePortal = true,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);
  const isCompact = size === "xs";

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
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
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen || !usePortal) return;

    const closeOnViewportChange = () => setIsOpen(false);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    return () => {
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
    };
  }, [isOpen, usePortal]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      className={`
        nc-model-selector-dropdown nc-select-dropdown nc-scrollbar-none z-[90]
        overflow-y-auto rounded-lg border border-base-300/80 bg-base-100 p-1.5
        shadow-[0_18px_44px_rgba(15,23,42,0.16)]
        ${usePortal ? "fixed" : "absolute left-0 right-0 top-full mt-2"}
        ${isCompact ? "max-h-56" : "max-h-72"}
      `}
      style={usePortal ? {
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      } : undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {options.length > 0 ? (
        <div className="space-y-1">
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                style={getOptionAnimationStyle(index)}
                className={`
                  nc-model-selector-option nc-select-option flex w-full items-center justify-between gap-2
                  rounded-lg border text-left
                  ${isCompact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"}
                  ${selected
                    ? "nc-model-selector-option-selected border-primary/25 bg-primary/10 text-primary shadow-[0_1px_10px_rgba(15,23,42,0.06)]"
                    : "border-transparent bg-transparent text-base-content hover:border-base-300/45 hover:bg-base-200/55 hover:shadow-[0_1px_8px_rgba(15,23,42,0.04)]"
                  }
                `}
                onClick={() => handleSelect(option.value)}
              >
                <span className="min-w-0 flex-1 truncate font-medium leading-5">
                  {option.label}
                </span>
                {selected && <Check className="nc-model-selector-check h-4 w-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-6 text-center text-xs text-base-content/45">
          暂无可选项
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`nc-select relative ${isCompact ? "nc-select-xs" : "nc-select-sm"} ${className}`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`
          nc-model-selector-trigger nc-select-trigger w-full rounded-lg border text-left
          flex items-center justify-between gap-2 bg-base-100 hover:bg-base-200/35
          ${isCompact ? "min-h-[30px] px-2.5 py-1.5 text-xs" : "min-h-[36px] px-3 py-2 text-sm"}
          ${isOpen ? "nc-model-selector-trigger-open border-primary/45 shadow-[0_0_0_3px_hsl(var(--p)/0.10)]" : "border-base-300/70"}
        `}
        onClick={() => {
          if (!isOpen) {
            updateDropdownPosition();
          }
          setIsOpen((open) => !open);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="min-w-0 flex-1 text-left">
          <span
            className={`block truncate leading-5 ${
              selectedOption ? "font-medium text-base-content" : "text-base-content/40"
            }`}
          >
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <span
          className={`
            nc-model-selector-chevron-shell flex flex-shrink-0 items-center justify-center rounded-md
            border border-base-300/70 bg-base-200/40
            ${isCompact ? "h-6 w-6" : "h-7 w-7"}
            ${isOpen ? "text-primary shadow-[0_1px_8px_rgba(15,23,42,0.08)]" : "text-base-content/45"}
          `}
        >
          <ChevronDown className={`nc-model-selector-chevron h-3.5 w-3.5 ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (usePortal ? createPortal(dropdown, document.body) : dropdown)}
    </div>
  );
}
