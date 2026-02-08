import { useState } from "react";
import { Settings, Trash2, Download, Upload, Undo2, Redo2, HelpCircle, Server, HardDrive, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFlowStore } from "@/stores/flowStore";
import { useStorageManagementStore } from "@/stores/storageManagementStore";
import { useModal, getModalAnimationClasses } from "@/hooks/useModal";
import { toast } from "@/stores/toastStore";
import { WorkflowControls } from "@/components/workflow/WorkflowControls";
import logoImage from "@/assets/logo.png";

export function Toolbar({ onOpenHelp }: { onOpenHelp?: () => void }) {
  const { openSettings, openProviderPanel } = useSettingsStore();
  const clearCanvas = useFlowStore((state) => state.clearCanvas);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const undo = useFlowStore((state) => state.undo);
  const redo = useFlowStore((state) => state.redo);
  const canUndo = useFlowStore((state) => state.canUndo);
  const canRedo = useFlowStore((state) => state.canRedo);
  const { openModal: openStorageModal } = useStorageManagementStore();

  // 清空画布确认对话框状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCanvas = () => {
    clearCanvas();
    setShowClearConfirm(false);
  };

  // 清理节点数据中的 base64 图片，仅保留文件路径
  const cleanNodeDataForExport = (nodes: ReturnType<typeof useFlowStore.getState>["nodes"]) => {
    return nodes.map((node) => {
      const cleanedNode = { ...node, data: { ...node.data } };
      const data = cleanedNode.data;

      // 清理 ImageInputNode 的 base64 数据
      if ("imageData" in data && "imagePath" in data) {
        delete data.imageData;
      }

      // 清理 ImageGeneratorNode 的 base64 数据
      if ("outputImage" in data && "outputImagePath" in data) {
        delete data.outputImage;
      }

      // 清理 PPTContentNode 的 pages 数据中的 base64
      if ("pages" in data && Array.isArray(data.pages)) {
        data.pages = data.pages.map((page: Record<string, unknown>) => {
          const cleanedPage = { ...page };

          // 清理 result 中的 base64
          if (cleanedPage.result && typeof cleanedPage.result === "object") {
            const result = cleanedPage.result as Record<string, unknown>;
            const cleanedResult = { ...result };
            if (cleanedResult.imagePath) delete cleanedResult.image;
            if (cleanedResult.thumbnailPath) delete cleanedResult.thumbnail;
            cleanedPage.result = cleanedResult;
          }

          // 清理手动上传图片的 base64
          if (cleanedPage.manualImagePath) delete cleanedPage.manualImage;
          if (cleanedPage.manualThumbnailPath) delete cleanedPage.manualThumbnail;

          return cleanedPage;
        });
      }

      return cleanedNode;
    });
  };

  // 导出工作流
  const handleExport = async () => {
    const { nodes, edges } = useFlowStore.getState();
    const cleanedNodes = cleanNodeDataForExport(nodes);
    const data = { nodes: cleanedNodes, edges };
    const jsonStr = JSON.stringify(data, null, 2);
    const fileName = `next-workflow-${Date.now()}.json`;

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (filePath) {
        await writeTextFile(filePath, jsonStr);
        toast.success(`工作流已保存到: ${filePath.split("/").pop()}`);
      }
    } catch (error) {
      console.error("导出工作流失败:", error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  // 导入工作流
  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const filePath = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });

      if (filePath && typeof filePath === "string") {
        const content = await readTextFile(filePath);
        const data = JSON.parse(content);
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          toast.success("工作流导入成功");
        } else {
          toast.error("无效的工作流文件");
        }
      }
    } catch (error) {
      console.error("导入工作流失败:", error);
      toast.error(`导入失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-base-100 border-b border-base-300">
      {/* 左侧 Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="NextCreator" className="w-8 h-8" />
          <span className="font-semibold text-lg">NextCreator</span>
        </div>
        <div className="badge badge-ghost badge-sm">v0.2.3</div>
      </div>

      {/* 中间工具 */}
      <div className="flex items-center gap-2">
        {/* 撤销/重做 */}
        <div className="tooltip tooltip-bottom" data-tip={`撤销 (${cmdKey}+Z)`}>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={undo}
            disabled={!canUndo()}
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip={`重做 (${cmdKey}+Shift+Z)`}>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={redo}
            disabled={!canRedo()}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        <div className="divider divider-horizontal mx-1" />

        {/* 工作流控制 */}
        <WorkflowControls />
        <div className="divider divider-horizontal mx-1" />

        <div className="tooltip tooltip-bottom" data-tip="导入工作流">
          <button className="btn btn-ghost btn-sm gap-2" onClick={handleImport}>
            <Upload className="w-4 h-4" />
            导入
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="导出工作流">
          <button className="btn btn-ghost btn-sm gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
        <div className="divider divider-horizontal mx-1" />
        <div className="tooltip tooltip-bottom" data-tip="清空画布">
          <button
            className="btn btn-ghost btn-sm text-error gap-2"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            清空
          </button>
        </div>
      </div>

      {/* 右侧设置 */}
      <div className="flex items-center gap-1">
        <div className="tooltip tooltip-bottom" data-tip="存储管理">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={openStorageModal}>
            <HardDrive className="w-5 h-5" />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="供应商管理">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={openProviderPanel}>
            <Server className="w-5 h-5" />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="帮助 (?)">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onOpenHelp}>
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="设置">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={openSettings}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 清空画布确认对话框 */}
      {showClearConfirm && (
        <ClearConfirmModal
          onConfirm={handleClearCanvas}
          onClose={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}

// 清空确认对话框组件
interface ClearConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

function ClearConfirmModal({ onConfirm, onClose }: ClearConfirmModalProps) {
  // 使用统一的 modal hook
  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen: true,
    onClose,
  });

  // 获取动画类名
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className={`
          absolute inset-0
          transition-all duration-200 ease-out
          ${backdropClasses}
        `}
        onClick={handleBackdropClick}
      />
      {/* Modal 内容 */}
      <div
        className={`
          relative bg-base-100 rounded-xl p-5 mx-4 max-w-sm shadow-xl
          transition-all duration-200 ease-out
          ${contentClasses}
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-error/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-error" />
          </div>
          <h3 className="font-semibold">确认清空</h3>
        </div>
        <p className="text-sm text-base-content/70 mb-5">
          确定要清空画布吗？这将删除画布上的所有节点和连线，此操作不可撤销。
        </p>
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            className="btn btn-error btn-sm"
            onClick={onConfirm}
          >
            确认清空
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
