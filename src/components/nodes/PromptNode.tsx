import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { MessageSquare, Edit3 } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { PromptEditorModal } from "@/components/ui/PromptEditorModal";
import type { PromptNodeData } from "@/types";

// 定义节点类型
type PromptNode = Node<PromptNodeData>;

// 提示词输入节点
// 使用 Modal 弹窗编辑，避免节点内滚动条导致画布模糊
export const PromptNode = memo(({ id, data, selected }: NodeProps<PromptNode>) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const prompt = data.prompt || "";

  // 保存提示词
  const handleSave = useCallback(
    (value: string) => {
      updateNodeData<PromptNodeData>(id, { prompt: value });
    },
    [id, updateNodeData]
  );

  // 打开编辑弹窗
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // 关闭编辑弹窗
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <div
        className={`
          min-w-[280px] max-w-[320px] rounded-xl bg-base-100 shadow-lg border-2 transition-all
          ${selected ? "border-primary shadow-primary/20" : "border-base-300"}
        `}
      >
        {/* 节点头部 */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">{data.label}</span>
          </div>
          {/* 编辑按钮 */}
          <button
            className="btn btn-circle btn-ghost btn-xs text-white hover:bg-white/20 nodrag"
            onClick={handleOpenModal}
            title="编辑提示词"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 节点内容 - 预览区域，点击打开编辑弹窗 */}
        <div
          className="p-3 nodrag cursor-pointer group"
          onClick={handleOpenModal}
        >
          <div
            className={`
              min-h-[60px] max-h-[100px] overflow-hidden rounded-lg p-2.5
              bg-base-200/50 border border-base-300
              group-hover:border-primary/50 group-hover:bg-base-200
              transition-colors text-sm
            `}
          >
            {prompt ? (
              <p className="text-base-content whitespace-pre-wrap break-words line-clamp-4">
                {prompt}
              </p>
            ) : (
              <p className="text-base-content/40 italic">点击编辑提示词...</p>
            )}
          </div>
          <p className="text-xs text-base-content/40 mt-1.5 text-center">
            点击编辑
          </p>
        </div>

        {/* 输出端口 - prompt 类型 */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-prompt"
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        />
      </div>

      {/* 编辑弹窗 */}
      {isModalOpen && (
        <PromptEditorModal
          initialValue={prompt}
          onSave={handleSave}
          onClose={handleCloseModal}
          title={data.label || "编辑提示词"}
        />
      )}
    </>
  );
});

PromptNode.displayName = "PromptNode";
