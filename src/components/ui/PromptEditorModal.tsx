import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, MessageSquare, Check } from "lucide-react";

interface PromptEditorModalProps {
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
  title?: string;
}

// 提示词编辑弹窗组件
// 使用 Portal 渲染到 body，避免被节点的 transform 影响导致画布模糊
export function PromptEditorModal({
  initialValue,
  onSave,
  onClose,
  title = "编辑提示词",
}: PromptEditorModalProps) {
  const [value, setValue] = useState(initialValue);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    // 聚焦到文本框末尾
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, []);

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // 保存并关闭
  const handleSave = useCallback(() => {
    onSave(value);
    handleClose();
  }, [value, onSave, handleClose]);

  // ESC 键关闭，Ctrl/Cmd + Enter 保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handleSave]);

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center p-4
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/60" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      {/* Modal 内容 */}
      <div
        className={`
          w-full max-w-2xl bg-base-100 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="text-base font-medium text-white">{title}</span>
          </div>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 编辑区域 */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered w-full h-[300px] text-sm resize-none focus:outline-none focus:border-primary"
            placeholder="输入提示词描述..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
          />
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-4 py-3 bg-base-200/50 border-t border-base-300">
          <span className="text-xs text-base-content/50">
            按 ESC 取消 · Ctrl/Cmd + Enter 保存
          </span>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              取消
            </button>
            <button className="btn btn-primary btn-sm gap-1" onClick={handleSave}>
              <Check className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
