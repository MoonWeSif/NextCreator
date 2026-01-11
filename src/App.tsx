import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { Toolbar } from "@/components/Toolbar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { Sidebar } from "@/components/Sidebar";
import { SettingsPanel, KeyboardShortcutsPanel } from "@/components/panels";
import { ProviderPanel } from "@/components/panels/ProviderPanel";
import { StorageManagementModal } from "@/components/ui/StorageManagementModal";
import { ToastContainer } from "@/components/ui/Toast";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { initializeImageGenerationProviders } from "@/services/imageGeneration";

import "@/index.css";

// 初始化图片生成提供商
initializeImageGenerationProviders();

function App() {
  const { activeCanvasId, getActiveCanvas, createCanvas, updateCanvasData, canvases, _hasHydrated } = useCanvasStore();
  const { nodes, edges, setNodes, setEdges } = useFlowStore();
  const theme = useSettingsStore((state) => state.settings.theme);

  // 帮助面板状态
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 用于追踪是否正在切换画布，避免循环更新
  const isLoadingCanvasRef = useRef(false);
  const prevCanvasIdRef = useRef<string | null>(null);

  // 应用主题到 HTML 元素
  useEffect(() => {
    const applyTheme = (themeName: string) => {
      if (themeName === "system") {
        // 跟随系统主题
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", themeName);
      }
    };

    applyTheme(theme);

    // 如果是跟随系统，监听系统主题变化
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // 初始化：如果没有画布，创建一个默认画布
  // 重要：必须等待 hydration 完成后再检查，否则会覆盖存储中的数据
  useEffect(() => {
    if (_hasHydrated && canvases.length === 0) {
      createCanvas("默认画布");
    }
  }, [_hasHydrated, canvases.length, createCanvas]);

  // 切换画布时加载画布数据
  useEffect(() => {
    if (activeCanvasId && activeCanvasId !== prevCanvasIdRef.current) {
      isLoadingCanvasRef.current = true;
      prevCanvasIdRef.current = activeCanvasId;

      const canvas = getActiveCanvas();
      if (canvas) {
        setNodes(canvas.nodes);
        setEdges(canvas.edges);
      }

      // 延迟重置标志，确保数据加载完成
      requestAnimationFrame(() => {
        isLoadingCanvasRef.current = false;
      });
    }
  }, [activeCanvasId, getActiveCanvas, setNodes, setEdges]);

  // 同步节点和边的变化到画布存储（防抖处理）
  useEffect(() => {
    // 如果正在加载画布数据，不进行同步
    if (isLoadingCanvasRef.current || !activeCanvasId) return;

    // 使用防抖来减少频繁更新
    // 300ms 延迟：平衡性能和数据安全，避免应用关闭时数据丢失
    const timer = setTimeout(() => {
      updateCanvasData(nodes, edges);
    }, 300);

    return () => clearTimeout(timer);
  }, [nodes, edges, activeCanvasId, updateCanvasData]);

  // 监听 ? 键打开帮助面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 拖拽开始处理
  const onDragStart = useCallback(
    (
      event: React.DragEvent,
      nodeType: string,
      defaultData: Record<string, unknown>
    ) => {
      event.dataTransfer.setData("application/reactflow/type", nodeType);
      event.dataTransfer.setData(
        "application/reactflow/data",
        JSON.stringify(defaultData)
      );
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* 顶部工具栏 */}
        <Toolbar onOpenHelp={() => setIsHelpOpen(true)} />

        {/* 主体内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧导航栏（包含画布列表和节点库） */}
          <Sidebar onDragStart={onDragStart} />

          {/* 右侧画布区域 */}
          <FlowCanvas />
        </div>

        {/* 设置面板 */}
        <SettingsPanel />

        {/* 供应商管理面板 */}
        <ProviderPanel />

        {/* 快捷键帮助面板 */}
        <KeyboardShortcutsPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* 存储管理弹窗 */}
        <StorageManagementModal />

        {/* Toast 通知容器 */}
        <ToastContainer />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
