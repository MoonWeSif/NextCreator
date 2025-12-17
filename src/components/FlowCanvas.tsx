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

export function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<CustomNode> | null>(null);

  const {
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    setSelectedNodes,
    setSelectedEdges,
    removeNode,
    removeNodes,
    removeEdge,
    removeEdges,
    duplicateNodes,
    copySelectedNodes,
    pasteNodes,
    toggleNodeLock,
    alignNodes,
    distributeNodes,
    autoLayout,
    undo,
    redo,
    canUndo,
    canRedo,
    selectAll,
    clearSelection,
    clipboard,
    isValidConnection,
    executeFromNode,
  } = useFlowStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
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
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow/type");
      const nodeDataStr = event.dataTransfer.getData("application/reactflow/data");

      if (!nodeType || !reactFlowInstance.current) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const defaultData = nodeDataStr ? JSON.parse(nodeDataStr) : {};
      addNode(nodeType, position, defaultData as CustomNodeData);
    },
    [addNode]
  );

  const onInit = useCallback((instance: ReactFlowInstance<CustomNode>) => {
    reactFlowInstance.current = instance;
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
    <div ref={reactFlowWrapper} className={`flex-1 h-full ${trimMode ? "cursor-crosshair" : ""}`}>
      <ReactFlow<CustomNode>
        nodes={nodes as CustomNode[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes as NodeTypes}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={!trimMode}
        panOnDrag={trimMode ? false : [1, 2]}
        selectNodesOnDrag={false}
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 100, y: 100, zoom: 1 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { strokeWidth: 2, stroke: "#9ca3af" },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="!bg-base-100 !border-base-300 !shadow-lg"
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
          color="#d1d5db"
        />
      </ReactFlow>

      {/* 裁剪模式提示 */}
      {trimMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-2 bg-error text-error-content rounded-lg shadow-lg">
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
