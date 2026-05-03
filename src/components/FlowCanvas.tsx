import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type NodeTypes,
  type Viewport,
  SelectionMode,
  ControlButton,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ClipboardPaste,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  Scissors,
  LayoutGrid,
  Play,
} from "lucide-react";

import { useFlowStore } from "@/stores/flowStore";
import { nodeTypes } from "@/components/nodes";
import { OverlayNodeLayer } from "@/components/canvas/OverlayNodeLayer";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import type { CustomNodeData } from "@/types";

// 定义自定义节点类型
type CustomNode = Node<CustomNodeData>;

// 右键菜单状态
interface ContextMenuState {
  x: number;
  y: number;
  type: "node" | "edge" | "pane";
  targetId?: string;
}

// WKWebView 模糊修复：将 zoom 吸附到固定步长，减少非整数 scale 的采样偏差。
// 非整数 scale 会导致节点内 overflow:scroll 等 CA 子层采样偏差，引发整节点模糊
const ZOOM_STEP = 0.1;

function snapViewport(x: number, y: number, zoom: number) {
  return {
    x: Math.round(x),
    y: Math.round(y),
    zoom: Math.round(zoom / ZOOM_STEP) * ZOOM_STEP,
  };
}

export function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<CustomNode> | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 100, y: 100, zoom: 1 });

  // 数据字段：用 selector 单独订阅，避免不相关状态变化触发重渲染
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useFlowStore((s) => s.selectedEdgeIds);
  const clipboard = useFlowStore((s) => s.clipboard);

  // 方法引用：zustand 中函数引用是稳定的，统一获取不会导致额外重渲染
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const addPromptTemplate = useFlowStore((s) => s.addPromptTemplate);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const setSelectedNodes = useFlowStore((s) => s.setSelectedNodes);
  const setSelectedEdges = useFlowStore((s) => s.setSelectedEdges);
  const removeNode = useFlowStore((s) => s.removeNode);
  const removeNodes = useFlowStore((s) => s.removeNodes);
  const removeEdge = useFlowStore((s) => s.removeEdge);
  const removeEdges = useFlowStore((s) => s.removeEdges);
  const duplicateNodes = useFlowStore((s) => s.duplicateNodes);
  const copySelectedNodes = useFlowStore((s) => s.copySelectedNodes);
  const pasteNodes = useFlowStore((s) => s.pasteNodes);
  const toggleNodeLock = useFlowStore((s) => s.toggleNodeLock);
  const alignNodes = useFlowStore((s) => s.alignNodes);
  const distributeNodes = useFlowStore((s) => s.distributeNodes);
  const autoLayout = useFlowStore((s) => s.autoLayout);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const canUndo = useFlowStore((s) => s.canUndo);
  const canRedo = useFlowStore((s) => s.canRedo);
  const selectAll = useFlowStore((s) => s.selectAll);
  const clearSelection = useFlowStore((s) => s.clearSelection);
  const isValidConnection = useFlowStore((s) => s.isValidConnection);
  const executeFromNode = useFlowStore((s) => s.executeFromNode);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // 裁剪模式状态
  const [trimMode, setTrimMode] = useState(false);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的操作
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete/Backspace - 删除选中的节点或边
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedNodeIds.length > 0) {
          removeNodes(selectedNodeIds);
        }
        if (selectedEdgeIds.length > 0) {
          removeEdges(selectedEdgeIds);
        }
      }

      // Ctrl/Cmd + C - 复制
      if (cmdOrCtrl && e.key === "c") {
        e.preventDefault();
        copySelectedNodes();
      }

      // Ctrl/Cmd + V - 粘贴
      if (cmdOrCtrl && e.key === "v") {
        e.preventDefault();
        pasteNodes();
      }

      // Ctrl/Cmd + D - 复制节点
      if (cmdOrCtrl && e.key === "d") {
        e.preventDefault();
        if (selectedNodeIds.length > 0) {
          duplicateNodes(selectedNodeIds);
        }
      }

      // Ctrl/Cmd + A - 全选
      if (cmdOrCtrl && e.key === "a") {
        e.preventDefault();
        selectAll();
      }

      // Ctrl/Cmd + O - 自动整理布局
      if (cmdOrCtrl && e.key === "o") {
        e.preventDefault();
        autoLayout();
      }

      // Ctrl/Cmd + Z - 撤销
      if (cmdOrCtrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canUndo()) undo();
      }

      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y - 重做
      if ((cmdOrCtrl && e.shiftKey && e.key === "z") || (cmdOrCtrl && e.key === "y")) {
        e.preventDefault();
        if (canRedo()) redo();
      }

      // Escape - 取消选择或退出裁剪模式
      if (e.key === "Escape") {
        if (trimMode) {
          setTrimMode(false);
        } else {
          clearSelection();
          setContextMenu(null);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeIds,
    selectedEdgeIds,
    removeNodes,
    removeEdges,
    copySelectedNodes,
    pasteNodes,
    duplicateNodes,
    selectAll,
    autoLayout,
    undo,
    redo,
    canUndo,
    canRedo,
    clearSelection,
    trimMode,
  ]);

  // 拖放处理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance.current) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 检查是否是外部图片文件拖拽
      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(file =>
          file.type.startsWith("image/")
        );

        if (imageFiles.length > 0) {
          // 为每个图片创建一个节点，水平排列
          const nodeWidth = 220;
          const nodeGap = 20;

          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const nodePosition = {
              x: position.x + i * (nodeWidth + nodeGap),
              y: position.y,
            };

            // 创建节点
            const nodeId = addNode("imageInputNode", nodePosition, {
              label: "图片输入",
            } as CustomNodeData);

            // 读取图片文件并更新节点数据
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(",")[1];
              updateNodeData(nodeId, {
                imageData: base64,
                fileName: file.name,
              });
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }

      // 检查是否是提示词模板拖放
      const promptTemplateStr = event.dataTransfer.getData("application/reactflow/prompt-template");
      if (promptTemplateStr) {
        try {
          const { promptText, template } = JSON.parse(promptTemplateStr);
          addPromptTemplate(position, promptText, template);
        } catch (err) {
          console.error("解析提示词模板数据失败:", err);
        }
        return;
      }

      // 普通节点拖放
      const nodeType = event.dataTransfer.getData("application/reactflow/type");
      const nodeDataStr = event.dataTransfer.getData("application/reactflow/data");

      if (!nodeType) {
        return;
      }

      const defaultData = nodeDataStr ? JSON.parse(nodeDataStr) : {};
      addNode(nodeType, position, defaultData as CustomNodeData);
    },
    [addNode, addPromptTemplate, updateNodeData]
  );

  const onInit = useCallback((instance: ReactFlowInstance<CustomNode>) => {
    reactFlowInstance.current = instance;
    // 启动时立即吸附 zoom，防止上次保存的非整数 zoom 导致模糊
    const vp = instance.getViewport();
    const snapped = snapViewport(vp.x, vp.y, vp.zoom);
    setViewport(snapped);
    if (snapped.x !== vp.x || snapped.y !== vp.y || snapped.zoom !== vp.zoom) {
      instance.setViewport(snapped, { duration: 0 });
    }
  }, []);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      // 裁剪模式下直接删除节点
      if (trimMode) {
        removeNode(node.id);
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      if (cmdOrCtrl || event.shiftKey) {
        // 多选模式
        if (selectedNodeIds.includes(node.id)) {
          setSelectedNodes(selectedNodeIds.filter((id) => id !== node.id));
        } else {
          setSelectedNodes([...selectedNodeIds, node.id]);
        }
      } else {
        setSelectedNode(node.id);
      }
    },
    [setSelectedNode, setSelectedNodes, selectedNodeIds, trimMode, removeNode]
  );

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback((_event: React.MouseEvent, node: { id: string }) => {
    setHoveredNodeId((current) => (current === node.id ? null : current));
  }, []);

  const onPaneClick = useCallback(() => {
    clearSelection();
    setContextMenu(null);
    // 不在这里退出裁剪模式，让用户可以继续裁剪
  }, [clearSelection]);

  // 节点右键菜单
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      // 如果右键的节点不在选中列表中，选中它
      if (!selectedNodeIds.includes(node.id)) {
        setSelectedNodes([node.id]);
      }
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "node",
        targetId: node.id,
      });
    },
    [selectedNodeIds, setSelectedNodes]
  );

  // 边右键菜单
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setSelectedEdges([edge.id]);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "edge",
        targetId: edge.id,
      });
    },
    [setSelectedEdges]
  );

  // 画布右键菜单
  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: "pane",
    });
  }, []);

  // 边点击
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // 裁剪模式下直接删除边
      if (trimMode) {
        removeEdge(edge.id);
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      if (cmdOrCtrl || event.shiftKey) {
        if (selectedEdgeIds.includes(edge.id)) {
          setSelectedEdges(selectedEdgeIds.filter((id) => id !== edge.id));
        } else {
          setSelectedEdges([...selectedEdgeIds, edge.id]);
        }
      } else {
        setSelectedEdges([edge.id]);
      }
    },
    [setSelectedEdges, selectedEdgeIds, trimMode, removeEdge]
  );

  // 框选处理
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodes(selectedNodes.map((n) => n.id));
      setSelectedEdges(selectedEdges.map((e) => e.id));
    },
    [setSelectedNodes, setSelectedEdges]
  );

  // 平移/缩放结束后吸附到干净坐标，防止非整数 scale/translate 导致 WKWebView 模糊
  const onMove = useCallback((_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    setViewport(viewport);
  }, []);

  const onMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    const snapped = snapViewport(viewport.x, viewport.y, viewport.zoom);
    setViewport(snapped);
    if (snapped.x !== viewport.x || snapped.y !== viewport.y || snapped.zoom !== viewport.zoom) {
      reactFlowInstance.current?.setViewport(snapped, { duration: 0 });
    }
  }, []);

  // 获取右键菜单项
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return [];

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdKey = isMac ? "⌘" : "Ctrl";

    if (contextMenu.type === "node") {
      const targetNode = nodes.find((n) => n.id === contextMenu.targetId);
      const isLocked = targetNode?.draggable === false;
      const hasMultipleSelected = selectedNodeIds.length > 1;

      const items: ContextMenuItem[] = [
        {
          id: "copy",
          label: "复制",
          icon: <Copy className="w-4 h-4" />,
          shortcut: `${cmdKey}+C`,
          onClick: () => copySelectedNodes(),
        },
        {
          id: "duplicate",
          label: "创建副本",
          icon: <ClipboardPaste className="w-4 h-4" />,
          shortcut: `${cmdKey}+D`,
          onClick: () => duplicateNodes(selectedNodeIds),
        },
        { id: "divider1", label: "", divider: true },
        {
          id: "lock",
          label: isLocked ? "解锁" : "锁定",
          icon: isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />,
          onClick: () => {
            if (contextMenu.targetId) {
              toggleNodeLock(contextMenu.targetId);
            }
          },
        },
      ];

      // 多选时显示对齐选项
      if (hasMultipleSelected) {
        items.push(
          { id: "divider2", label: "", divider: true },
          {
            id: "align-left",
            label: "左对齐",
            icon: <AlignStartVertical className="w-4 h-4" />,
            onClick: () => alignNodes("left"),
          },
          {
            id: "align-right",
            label: "右对齐",
            icon: <AlignEndVertical className="w-4 h-4" />,
            onClick: () => alignNodes("right"),
          },
          {
            id: "align-top",
            label: "顶部对齐",
            icon: <AlignStartHorizontal className="w-4 h-4" />,
            onClick: () => alignNodes("top"),
          },
          {
            id: "align-bottom",
            label: "底部对齐",
            icon: <AlignEndHorizontal className="w-4 h-4" />,
            onClick: () => alignNodes("bottom"),
          }
        );

        // 3个以上节点时显示分布选项
        if (selectedNodeIds.length >= 3) {
          items.push(
            { id: "divider3", label: "", divider: true },
            {
              id: "distribute-h",
              label: "水平分布",
              onClick: () => distributeNodes("horizontal"),
            },
            {
              id: "distribute-v",
              label: "垂直分布",
              onClick: () => distributeNodes("vertical"),
            }
          );
        }
      }

      items.push(
        { id: "divider-workflow", label: "", divider: true },
        {
          id: "execute-from-node",
          label: "从此节点开始执行",
          icon: <Play className="w-4 h-4" />,
          onClick: () => {
            if (contextMenu.targetId) {
              executeFromNode(contextMenu.targetId);
            }
          },
        },
        { id: "divider-delete", label: "", divider: true },
        {
          id: "delete",
          label: hasMultipleSelected ? `删除 ${selectedNodeIds.length} 个节点` : "删除",
          icon: <Trash2 className="w-4 h-4" />,
          shortcut: "Del",
          danger: true,
          onClick: () => {
            if (hasMultipleSelected) {
              removeNodes(selectedNodeIds);
            } else if (contextMenu.targetId) {
              removeNode(contextMenu.targetId);
            }
          },
        }
      );

      return items;
    }

    if (contextMenu.type === "edge") {
      return [
        {
          id: "delete-edge",
          label: "删除连线",
          icon: <Trash2 className="w-4 h-4" />,
          shortcut: "Del",
          danger: true,
          onClick: () => {
            if (contextMenu.targetId) {
              removeEdge(contextMenu.targetId);
            }
          },
        },
      ];
    }

    // 画布右键菜单
    return [
      {
        id: "paste",
        label: "粘贴",
        icon: <ClipboardPaste className="w-4 h-4" />,
        shortcut: `${cmdKey}+V`,
        disabled: !clipboard,
        onClick: () => pasteNodes(),
      },
      { id: "divider1", label: "", divider: true },
      {
        id: "select-all",
        label: "全选",
        shortcut: `${cmdKey}+A`,
        onClick: () => selectAll(),
      },
      { id: "divider2", label: "", divider: true },
      {
        id: "undo",
        label: "撤销",
        shortcut: `${cmdKey}+Z`,
        disabled: !canUndo(),
        onClick: () => undo(),
      },
      {
        id: "redo",
        label: "重做",
        shortcut: `${cmdKey}+Shift+Z`,
        disabled: !canRedo(),
        onClick: () => redo(),
      },
    ];
  }, [
    contextMenu,
    nodes,
    selectedNodeIds,
    clipboard,
    copySelectedNodes,
    duplicateNodes,
    toggleNodeLock,
    alignNodes,
    distributeNodes,
    removeNode,
    removeNodes,
    removeEdge,
    pasteNodes,
    selectAll,
    canUndo,
    canRedo,
    undo,
    redo,
  ]);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  return (
    <div ref={reactFlowWrapper} className={`relative flex-1 h-full ${trimMode ? "cursor-crosshair" : ""}`}>
      <ReactFlow<CustomNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes as NodeTypes}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={!trimMode}
        panOnDrag={trimMode ? false : [1, 2]}
        selectNodesOnDrag={false}
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        nodeDragThreshold={10}
        nodeClickDistance={5}
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 100, y: 100, zoom: 1 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { strokeWidth: 2, stroke: "var(--nc-subtle)" },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="!bg-base-100 !border-base-300"
          showZoom
          showFitView
          showInteractive={false}
        >
          {/* 自动整理按钮 */}
          <ControlButton
            onClick={autoLayout}
            title={`自动整理 (${cmdKey}+O)`}
          >
            <LayoutGrid className="w-4 h-4" />
          </ControlButton>
          {/* 裁剪模式按钮 */}
          <ControlButton
            onClick={() => setTrimMode(!trimMode)}
            title={trimMode ? "退出裁剪模式 (Esc)" : "裁剪模式"}
            className={trimMode ? "!bg-error !text-error-content" : ""}
          >
            <Scissors className="w-4 h-4" />
          </ControlButton>
        </Controls>
        <MiniMap
          className="!bg-base-100 !border-base-300"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(97,93,89,0.28)"
        />
      </ReactFlow>

      <OverlayNodeLayer
        nodes={nodes}
        selectedNodeIds={selectedNodeIds}
        hoveredNodeId={hoveredNodeId}
        viewport={viewport}
      />

      {/* 裁剪模式提示 */}
      {trimMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-2 bg-error text-error-content rounded-lg shadow-[var(--nc-shadow-card)]">
            <Scissors className="w-4 h-4" />
            <span className="text-sm font-medium">裁剪模式：点击节点或连线可删除</span>
            <button
              className="ml-2 px-2 py-0.5 text-xs bg-error-content/20 rounded hover:bg-error-content/30"
              onClick={() => setTrimMode(false)}
            >
              退出 (Esc)
            </button>
          </div>
        </div>
      )}

      {/* 右键上下文菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
