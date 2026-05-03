import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { Toolbar } from "@/components/Toolbar";
import { FlowCanvas } from "@/components/FlowCanvas";
import { Sidebar } from "@/components/Sidebar";
import { NodeInspector } from "@/components/inspectors/NodeInspector";
import { SettingsPanel, KeyboardShortcutsPanel } from "@/components/panels";
import { ProviderPanel } from "@/components/panels/ProviderPanel";
import { StorageManagementModal } from "@/components/ui/StorageManagementModal";
import { ToastContainer } from "@/components/ui/Toast";
import { useCanvasStore } from "@/stores/canvasStore";
import { useFlowStore } from "@/stores/flowStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { initializeImageGenerationProviders } from "@/services/imageGeneration";
import { initializeVideoGenerationProviders } from "@/services/videoGeneration";

import "@/index.css";

// 初始化图片生成提供商
initializeImageGenerationProviders();
// 初始化视频生成提供商
initializeVideoGenerationProviders();

function App() {
  // 细粒度 selector 订阅，避免不相关状态变化触发重渲染
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId);
  const getActiveCanvas = useCanvasStore((s) => s.getActiveCanvas);
  const createCanvas = useCanvasStore((s) => s.createCanvas);
  const canvases = useCanvasStore((s) => s.canvases);
  const _hasHydrated = useCanvasStore((s) => s._hasHydrated);
  // nodes/edges 不订阅到 React 状态——改用 store.subscribe 做数据同步
  // 避免每次节点变化都触发 App 重渲染（进而引发 Sidebar 等子树重渲染）
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
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

  // 切换画布时：先保存旧画布数据，再加载新画布
  useEffect(() => {
    if (activeCanvasId && activeCanvasId !== prevCanvasIdRef.current) {
      // 切换前先将当前 flowStore 的数据同步到旧画布，避免防抖丢数据
      const prevId = prevCanvasIdRef.current;
      if (prevId) {
        const currentNodes = useFlowStore.getState().nodes;
        const currentEdges = useFlowStore.getState().edges;
        // 注意：此时 activeCanvasId 已经是新画布 ID，
        // 必须用 prevId 直接定位旧画布进行更新
        useCanvasStore.setState((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === prevId
              ? { ...c, nodes: currentNodes, edges: currentEdges, updatedAt: Date.now() }
              : c
          ),
        }));
      }

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

  // 同步节点/边到画布存储：用 store.subscribe 替代 React effect+订阅
  // 好处：节点拖拽/编辑不触发 App 重渲染，只在后台防抖同步数据
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useFlowStore.subscribe((state, prevState) => {
      if (state.nodes === prevState.nodes && state.edges === prevState.edges) return;
      if (isLoadingCanvasRef.current) return;
      if (!useCanvasStore.getState().activeCanvasId) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const { nodes, edges } = useFlowStore.getState();
        useCanvasStore.getState().updateCanvasData(nodes, edges);
      }, 800);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

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
      <div className="nc-app-shell flex flex-col h-screen w-screen overflow-hidden">
        {/* 顶部工具栏 */}
        <Toolbar onOpenHelp={() => setIsHelpOpen(true)} />

        {/* 主体内容 */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 左侧导航栏（包含画布列表和节点库） */}
          <Sidebar onDragStart={onDragStart} />

          {/* 右侧画布区域 */}
          <FlowCanvas />

          {/* 选中节点检查器 */}
          <NodeInspector />
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
