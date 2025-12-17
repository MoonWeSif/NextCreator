/**
 * 工作流控制组件
 * 提供运行、暂停、恢复、取消等控制按钮
 */

import { useState } from "react";
import { Play, Pause, Square, Loader2, AlertTriangle, CheckCircle, X, Info } from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";

export function WorkflowControls() {
  const workflowExecution = useFlowStore((state) => state.workflowExecution);
  const executeWorkflow = useFlowStore((state) => state.executeWorkflow);
  const pauseWorkflow = useFlowStore((state) => state.pauseWorkflow);
  const resumeWorkflow = useFlowStore((state) => state.resumeWorkflow);
  const cancelWorkflow = useFlowStore((state) => state.cancelWorkflow);
  const clearWorkflowExecution = useFlowStore((state) => state.clearWorkflowExecution);
  const nodes = useFlowStore((state) => state.nodes);

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const status = workflowExecution?.status;
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const hasError = status === "error";
  const isIdle = !status || status === "idle";

  const progress = workflowExecution?.progress;
  const hasProgress = progress && progress.total > 0;
  const errors = workflowExecution?.errors || {};
  const errorCount = Object.keys(errors).length;

  // 获取节点名称（特殊处理工作流级别错误）
  const getNodeLabel = (nodeId: string) => {
    if (nodeId === "__workflow__") {
      return "工作流错误";
    }
    const node = nodes.find((n) => n.id === nodeId);
    return (node?.data as { label?: string })?.label || `节点 ${nodeId.slice(0, 6)}`;
  };

  return (
    <div className="flex items-center gap-1 relative">
      {/* 空闲状态：显示运行按钮 */}
      {isIdle && (
        <div className="tooltip tooltip-bottom" data-tip="运行全部工作流">
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={executeWorkflow}
          >
            <Play className="w-4 h-4" />
            运行全部
          </button>
        </div>
      )}

      {/* 运行中状态：显示暂停和停止按钮 */}
      {isRunning && (
        <>
          <div className="tooltip tooltip-bottom" data-tip="暂停执行">
            <button
              className="btn btn-warning btn-sm btn-square"
              onClick={pauseWorkflow}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
          <div className="tooltip tooltip-bottom" data-tip="停止执行">
            <button
              className="btn btn-error btn-sm btn-square"
              onClick={cancelWorkflow}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* 暂停状态：显示继续和停止按钮 */}
      {isPaused && (
        <>
          <div className="tooltip tooltip-bottom" data-tip="继续执行">
            <button
              className="btn btn-success btn-sm btn-square"
              onClick={resumeWorkflow}
            >
              <Play className="w-4 h-4" />
            </button>
          </div>
          <div className="tooltip tooltip-bottom" data-tip="停止执行">
            <button
              className="btn btn-error btn-sm btn-square"
              onClick={cancelWorkflow}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* 完成状态：显示结果 */}
      {isCompleted && !hasError && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-success text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>执行完成</span>
            {hasProgress && (
              <span className="text-xs opacity-70">
                ({progress.completed}/{progress.total})
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={clearWorkflowExecution}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 错误状态：显示错误摘要和查看详情按钮 */}
      {hasError && (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 text-error text-sm hover:bg-error/10 px-2 py-1 rounded transition-colors"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{errorCount} 个节点失败</span>
            <Info className="w-3 h-3 opacity-60" />
          </button>
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => {
              setShowErrorDetails(false);
              clearWorkflowExecution();
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 进度指示器 */}
      {(isRunning || isPaused) && hasProgress && (
        <div className="flex items-center gap-2 ml-2 text-xs text-base-content/70">
          {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>
            {progress.completed} / {progress.total}
          </span>
        </div>
      )}

      {/* 错误详情弹出框 */}
      {showErrorDetails && hasError && errorCount > 0 && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowErrorDetails(false)}
          />
          {/* 错误列表 */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-base-100 rounded-lg shadow-xl border border-base-300 min-w-[300px] max-w-[400px] max-h-[300px] overflow-auto">
            <div className="sticky top-0 bg-base-100 px-3 py-2 border-b border-base-300 flex items-center justify-between">
              <span className="text-sm font-medium">失败节点详情</span>
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={() => setShowErrorDetails(false)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2 space-y-2">
              {Object.entries(errors).map(([nodeId, errorMsg]) => (
                <div
                  key={nodeId}
                  className="bg-error/10 rounded-lg p-2 text-sm"
                >
                  <div className="font-medium text-error mb-1">
                    {getNodeLabel(nodeId)}
                  </div>
                  <div className="text-base-content/70 text-xs break-words">
                    {errorMsg}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
