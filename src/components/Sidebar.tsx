import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  Blocks,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  ChevronRight,
  GripVertical,
  BookText,
  Eye,
} from "lucide-react";
import { useCanvasStore, type SidebarView } from "@/stores/canvasStore";
import { nodeCategories, nodeIconMap, nodeIconColors } from "@/config/nodeConfig";
import { promptCategories, promptIconMap, promptIconColors, type PromptItem } from "@/config/promptConfig";
import { Input } from "@/components/ui/Input";
import { PromptPreviewModal } from "@/components/ui/PromptPreviewModal";

// 导航项定义
const navItems: { id: SidebarView; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "canvases", icon: LayoutGrid, label: "画布" },
  { id: "nodes", icon: Blocks, label: "节点" },
  { id: "prompts", icon: BookText, label: "提示词" },
];

interface SidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: string, defaultData: Record<string, unknown>) => void;
}

export function Sidebar({ onDragStart }: SidebarProps) {
  const {
    canvases,
    activeCanvasId,
    sidebarView,
    setSidebarView,
    createCanvas,
    deleteCanvas,
    renameCanvas,
    switchCanvas,
    duplicateCanvas,
  } = useCanvasStore();

  // 画布相关状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // 节点面板相关状态
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(nodeCategories.map((c) => c.id))
  );

  // 提示词面板相关状态
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const [expandedPromptCategories, setExpandedPromptCategories] = useState<Set<string>>(
    new Set(promptCategories.map((c) => c.id))
  );
  const [previewPrompt, setPreviewPrompt] = useState<PromptItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpenId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果点击的不是菜单内容，关闭菜单
      if (!target.closest(".canvas-context-menu")) {
        setMenuOpenId(null);
        setMenuPosition(null);
      }
    };

    // ESC 键关闭菜单
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpenId]);

  // 打开菜单
  const openMenu = useCallback((canvasId: string) => {
    const button = menuButtonRefs.current.get(canvasId);
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 128, // 菜单宽度 128px，右对齐
      });
      setMenuOpenId(canvasId);
    }
  }, []);

  // 画布操作
  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setMenuOpenId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId && editName.trim()) {
      renameCanvas(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  }, [editingId, editName, renameCanvas]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName("");
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteCanvas(id);
    setMenuOpenId(null);
  }, [deleteCanvas]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateCanvas(id);
    setMenuOpenId(null);
  }, [duplicateCanvas]);

  const handleCreateCanvas = useCallback(() => {
    createCanvas();
  }, [createCanvas]);

  // 节点面板操作
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // 提示词面板操作
  const togglePromptCategory = useCallback((categoryId: string) => {
    setExpandedPromptCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // 打开提示词预览 Modal
  const openPromptPreview = useCallback((prompt: PromptItem) => {
    setPreviewPrompt(prompt);
    setIsPreviewModalOpen(true);
  }, []);

  // 关闭提示词预览 Modal
  const closePromptPreview = useCallback(() => {
    setIsPreviewModalOpen(false);
  }, []);

  // 过滤节点
  const filteredCategories = nodeCategories
    .map((category) => ({
      ...category,
      nodes: category.nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.nodes.length > 0);

  // 过滤提示词
  const filteredPromptCategories = promptCategories
    .map((category) => ({
      ...category,
      prompts: category.prompts.filter(
        (prompt) =>
          prompt.title.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
          prompt.titleEn.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
          prompt.description.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
          prompt.tags.some((tag) => tag.toLowerCase().includes(promptSearchQuery.toLowerCase()))
      ),
    }))
    .filter((category) => category.prompts.length > 0);

  // 获取当前打开菜单的画布
  const menuCanvas = menuOpenId ? canvases.find((c) => c.id === menuOpenId) : null;

  return (
    <>
    <div className="flex h-full flex-shrink-0">
      {/* 最左侧图标导航栏 */}
      <div className="w-14 flex flex-col items-center py-3 bg-base-200 border-r border-base-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = sidebarView === item.id;
          return (
            <button
              key={item.id}
              className={`
                w-10 h-10 flex items-center justify-center rounded-lg mb-2
                transition-colors tooltip tooltip-right
                ${isActive
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-300 text-base-content/70 hover:text-base-content"
                }
              `}
              data-tip={item.label}
              onClick={() => setSidebarView(item.id)}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* 右侧内容面板 - 固定宽度 */}
      <div className="w-56 flex flex-col bg-base-100 border-r border-base-300">
        {/* 画布视图 */}
        {sidebarView === "canvases" && (
          <>
            {/* 头部 */}
            <div className="p-3 border-b border-base-300 flex items-center justify-between">
              <h3 className="font-semibold text-sm">我的画布</h3>
              <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={handleCreateCanvas}
                title="新建画布"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 画布列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {canvases.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无画布</p>
                  <button
                    className="btn btn-primary btn-xs mt-3"
                    onClick={handleCreateCanvas}
                  >
                    新建画布
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {canvases.map((canvas) => (
                    <div
                      key={canvas.id}
                      className={`
                        group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                        transition-colors
                        ${activeCanvasId === canvas.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-base-200"
                        }
                      `}
                      onClick={() => editingId !== canvas.id && switchCanvas(canvas.id)}
                    >
                      {editingId === canvas.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0"
                          />
                          <button
                            className="btn btn-ghost btn-xs btn-circle"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit();
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs btn-circle"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {canvas.name}
                            </div>
                            <div className="text-xs text-base-content/50">
                              {canvas.nodes.length} 个节点
                            </div>
                          </div>

                          <button
                            ref={(el) => {
                              if (el) menuButtonRefs.current.set(canvas.id, el);
                            }}
                            className={`
                              btn btn-ghost btn-xs btn-circle
                              ${menuOpenId === canvas.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (menuOpenId === canvas.id) {
                                setMenuOpenId(null);
                                setMenuPosition(null);
                              } else {
                                openMenu(canvas.id);
                              }
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 节点视图 */}
        {sidebarView === "nodes" && (
          <>
            {/* 头部 */}
            <div className="p-3 border-b border-base-300">
              <h3 className="font-semibold text-sm mb-2">节点库</h3>
              <Input
                isSearch
                placeholder="搜索节点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 节点列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCategories.map((category) => (
                <div key={category.id} className="mb-2">
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedCategories.has(category.id) ? "rotate-90" : ""
                      }`}
                    />
                    <span>{category.name}</span>
                    <span className="text-xs text-base-content/40 ml-auto">
                      {category.nodes.length}
                    </span>
                  </button>

                  {/* 使用 grid 实现平滑展开/收起动画 */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      expandedCategories.has(category.id)
                        ? "grid-rows-[1fr]"
                        : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-1 space-y-1">
                        {category.nodes.map((node) => {
                          const IconComponent = nodeIconMap[node.icon];
                          const iconColorClass = nodeIconColors[node.icon] || "";
                          return (
                            <div
                              key={node.type}
                              className="draggable-node flex items-center gap-2 px-2 py-2 bg-base-200/50 hover:bg-base-200 rounded-lg transition-colors group cursor-grab"
                              draggable
                              onDragStart={(e) => onDragStart(e, node.type, node.defaultData)}
                            >
                              <GripVertical className="w-3 h-3 text-base-content/30 group-hover:text-base-content/50 flex-shrink-0" />
                              <div className={`p-1.5 rounded-lg flex-shrink-0 ${iconColorClass}`}>
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{node.label}</div>
                                <div className="text-xs text-base-content/50 truncate">
                                  {node.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="p-3 border-t border-base-300">
              <p className="text-xs text-base-content/40 text-center">
                拖拽节点到画布中使用
              </p>
            </div>
          </>
        )}

        {/* 提示词视图 */}
        {sidebarView === "prompts" && (
          <>
            {/* 头部 */}
            <div className="p-3 border-b border-base-300">
              <h3 className="font-semibold text-sm mb-2">提示词库</h3>
              <Input
                isSearch
                placeholder="搜索提示词..."
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
              />
            </div>

            {/* 提示词列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredPromptCategories.map((category) => {
                const CategoryIcon = promptIconMap[category.icon];
                const categoryColorClass = promptIconColors[category.icon] || "";
                return (
                  <div key={category.id} className="mb-2">
                    <button
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors"
                      onClick={() => togglePromptCategory(category.id)}
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          expandedPromptCategories.has(category.id) ? "rotate-90" : ""
                        }`}
                      />
                      <div className={`p-1 rounded ${categoryColorClass}`}>
                        {CategoryIcon && <CategoryIcon className="w-3 h-3" />}
                      </div>
                      <span className="truncate">{category.name}</span>
                      <span className="text-xs text-base-content/40 ml-auto">
                        {category.prompts.length}
                      </span>
                    </button>

                    {/* 使用 grid 实现平滑展开/收起动画 */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        expandedPromptCategories.has(category.id)
                          ? "grid-rows-[1fr]"
                          : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-1">
                          {category.prompts.map((prompt) => (
                            <div
                              key={prompt.id}
                              className="draggable-prompt flex items-start gap-2 px-2 py-2 bg-base-200/50 hover:bg-base-200 rounded-lg transition-colors group cursor-grab"
                              draggable
                              onDragStart={(e) => {
                                // 设置提示词模板数据
                                e.dataTransfer.setData(
                                  "application/reactflow/prompt-template",
                                  JSON.stringify({
                                    promptText: prompt.prompt,
                                    template: prompt.nodeTemplate,
                                  })
                                );
                                e.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              <GripVertical className="w-3 h-3 mt-1 text-base-content/30 group-hover:text-base-content/50 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{prompt.title}</div>
                                <div className="text-xs text-base-content/50 truncate">
                                  {prompt.description}
                                </div>
                              </div>
                              <button
                                className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPromptPreview(prompt);
                                }}
                                title="预览提示词"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部提示 */}
            <div className="p-3 border-t border-base-300">
              <p className="text-xs text-base-content/40 text-center">
                拖拽提示词到画布中使用
              </p>
            </div>
          </>
        )}
      </div>
    </div>

    {/* Portal: 画布上下文菜单 */}
    {menuOpenId && menuPosition && menuCanvas && createPortal(
      <ul
        className="canvas-context-menu menu bg-base-100 rounded-box w-32 p-1 shadow-lg border border-base-300 fixed z-[9999]"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        <li>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEditing(menuCanvas.id, menuCanvas.name);
            }}
          >
            <Edit3 className="w-4 h-4" />
            重命名
          </button>
        </li>
        <li>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(menuCanvas.id);
            }}
          >
            <Copy className="w-4 h-4" />
            复制
          </button>
        </li>
        <li>
          <button
            className="text-error"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(menuCanvas.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </li>
      </ul>,
      document.body
    )}

    {/* 提示词预览 Modal */}
    <PromptPreviewModal
      prompt={previewPrompt}
      isOpen={isPreviewModalOpen}
      onClose={closePromptPreview}
    />
    </>
  );
}
