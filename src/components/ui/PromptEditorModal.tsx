import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, MessageSquare, Check, AlertTriangle } from "lucide-react";

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
  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  // 检测内容是否有变化
  const hasChanges = useMemo(() => value !== initialValue, [value, initialValue]);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    // 聚焦到文本框末尾
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, []);

  // 真正执行关闭（播放退出动画）
  const doClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // 尝试关闭 - 检查是否有未保存的更改
  const handleClose = useCallback(() => {
    if (hasChanges) {
      // 有未保存的更改，显示确认对话框
      setShowConfirmDialog(true);
    } else {
      // 没有更改，直接关闭
      doClose();
    }
  }, [hasChanges, doClose]);

  // 确认对话框：保存并关闭
  const handleConfirmSave = useCallback(() => {
    onSave(value);
    setShowConfirmDialog(false);
    doClose();
  }, [value, onSave, doClose]);

  // 确认对话框：不保存直接关闭
  const handleConfirmDiscard = useCallback(() => {
    setShowConfirmDialog(false);
    doClose();
  }, [doClose]);

  // 确认对话框：取消（返回编辑）
  const handleConfirmCancel = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // 保存并关闭
  const handleSave = useCallback(() => {
    onSave(value);
    doClose();
  }, [value, onSave, doClose]);

  // ESC 键关闭，Ctrl/Cmd + Enter 保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showConfirmDialog) {
          // 确认对话框打开时，ESC 关闭确认对话框
          setShowConfirmDialog(false);
        } else {
          handleClose();
        }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handleSave, showConfirmDialog]);

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

      {/* 未保存确认对话框 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40"
          onClick={handleConfirmCancel}
        >
          <div
            className="w-full max-w-sm bg-base-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 警告头部 */}
            <div className="flex items-center gap-3 px-4 py-3 bg-warning/10 border-b border-warning/20">
              <div className="p-2 bg-warning/20 rounded-full">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-medium text-base-content">未保存的更改</h3>
                <p className="text-xs text-base-content/60">您有尚未保存的内容</p>
              </div>
            </div>

            {/* 选项按钮 */}
            <div className="p-4 space-y-2">
              <button
                className="btn btn-primary btn-sm w-full gap-2"
                onClick={handleConfirmSave}
              >
                <Check className="w-4 h-4" />
                保存更改
              </button>
              <button
                className="btn btn-ghost btn-sm w-full text-error hover:bg-error/10"
                onClick={handleConfirmDiscard}
              >
                不保存，直接关闭
              </button>
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={handleConfirmCancel}
              >
                取消，继续编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
