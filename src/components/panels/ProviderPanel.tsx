import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Server,
  AlertTriangle,
  Image,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useModal, getModalAnimationClasses } from "@/hooks/useModal";
import { NODE_ALLOWED_PROTOCOLS } from "@/types";
import type { Provider, NodeProviderMapping, ProviderProtocol } from "@/types";

// 协议类型配置
const protocolConfig: { key: ProviderProtocol; label: string }[] = [
  { key: "openai", label: "OpenAI" },
  { key: "openaiResponses", label: "OpenAI Responses" },
  { key: "google", label: "Google" },
  { key: "claude", label: "Claude" },
];

// 协议类型显示标签
const protocolLabels: Record<ProviderProtocol, string> = {
  openai: "OpenAI",
  openaiResponses: "OpenAI Responses",
  google: "Google",
  claude: "Claude",
};

// 节点类型配置
const nodeTypeConfig: { key: keyof NodeProviderMapping; label: string; description: string }[] = [
  { key: "imageGeneratorPro", label: "Gemini Pro 图片协议", description: "兼容 Gemini generateContent 的专业图片配置" },
  { key: "imageGeneratorFast", label: "Gemini Fast 图片协议", description: "兼容 Gemini generateContent 的快速图片配置" },
  { key: "imageGeneratorNB2", label: "Gemini 图片协议", description: "统一绘图节点的 Gemini generateContent 供应商" },
  { key: "dalleGenerator", label: "DALL-E 绘图", description: "旧版 DALL-E Images API 配置" },
  { key: "fluxGenerator", label: "Flux 绘图", description: "Flux 图片生成节点" },
  { key: "gptImageGenerator", label: "OpenAI Images API", description: "统一绘图节点的 /images/generations 与 /images/edits 供应商" },
  { key: "doubaoGenerator", label: "豆包绘图", description: "字节跳动豆包图片生成节点" },
  { key: "zImageGenerator", label: "Z-Image 绘图", description: "Gitee AI Z-Image 图片生成节点" },
  { key: "videoGenerator", label: "OpenAI Videos API", description: "统一视频节点的 /v1/videos 供应商" },
  { key: "newApiVideoGenerator", label: "new-api 通用视频", description: "统一视频节点的 /v1/video/generations 供应商" },
  { key: "veoGenerator", label: "Veo 视频生成", description: "Gemini Veo 视频生成节点" },
  { key: "klingGenerator", label: "Kling 视频生成", description: "Kling 视频生成节点" },
  { key: "llmContent", label: "LLM 内容生成", description: "大语言模型内容生成节点" },
  { key: "llm", label: "PPT 大纲生成", description: "PPT 内容节点的大纲生成部分" },
];

// 节点分组配置
interface NodeGroup {
  id: string;
  label: string;
  icon: typeof Image;
  colorClass: string;
  bgClass: string;
  nodeKeys: (keyof NodeProviderMapping)[];
}

const nodeGroups: NodeGroup[] = [
  {
    id: "image",
    label: "图片生成",
    icon: Image,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    nodeKeys: [
      "imageGeneratorPro", "imageGeneratorFast", "imageGeneratorNB2",
      "dalleGenerator", "fluxGenerator", "gptImageGenerator",
      "doubaoGenerator", "zImageGenerator",
    ],
  },
  {
    id: "video",
    label: "视频生成",
    icon: Video,
    colorClass: "text-purple-500",
    bgClass: "bg-purple-500/10",
    nodeKeys: ["videoGenerator", "newApiVideoGenerator"],
  },
  {
    id: "llm",
    label: "文本 / LLM",
    icon: MessageSquare,
    colorClass: "text-green-500",
    bgClass: "bg-green-500/10",
    nodeKeys: ["llmContent", "llm"],
  },
];

// 根据 key 查找节点配置
const nodeConfigMap = new Map(nodeTypeConfig.map((n) => [n.key, n]));

export function ProviderPanel() {
  const {
    settings,
    isProviderPanelOpen,
    closeProviderPanel,
    addProvider,
    updateProvider,
    removeProvider,
    setNodeProvider,
  } = useSettingsStore();

  // 编辑/添加供应商的弹窗状态
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  // 分组折叠状态（默认全部展开）
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // 使用统一的 modal hook
  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen: isProviderPanelOpen,
    onClose: closeProviderPanel,
  });

  // 获取动画类名
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  if (!isProviderPanelOpen) return null;

  // 确保 providers 数组存在
  const providers = settings.providers || [];
  const nodeProviders = settings.nodeProviders || {};

  // 计算配置进度
  const totalNodes = nodeTypeConfig.length;
  const configuredNodes = nodeTypeConfig.filter(
    ({ key }) => nodeProviders[key] && providers.some((p) => p.id === nodeProviders[key])
  ).length;

  // 切换分组折叠
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 自动保存：直接更新 store
  const handleNodeProviderChange = (nodeKey: keyof NodeProviderMapping, providerId: string) => {
    setNodeProvider(nodeKey, providerId || undefined);
  };

  // 批量分配：将供应商分配给分组内所有兼容节点
  const handleBatchAssign = (group: NodeGroup, providerId: string) => {
    if (!providerId) return;
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    for (const key of group.nodeKeys) {
      // 只分配给协议兼容的节点
      if (NODE_ALLOWED_PROTOCOLS[key].includes(provider.protocol)) {
        setNodeProvider(key, providerId);
      }
    }
  };

  // 获取分组内兼容的供应商列表（取所有节点兼容协议的并集）
  const getGroupCompatibleProviders = (group: NodeGroup) => {
    const allProtocols = new Set<ProviderProtocol>();
    for (const key of group.nodeKeys) {
      for (const p of NODE_ALLOWED_PROTOCOLS[key]) {
        allProtocols.add(p);
      }
    }
    return providers.filter((p) => allProtocols.has(p.protocol));
  };

  // 删除供应商 - 显示确认弹窗
  const handleDeleteProvider = (provider: Provider) => {
    setDeleteConfirm({ id: provider.id, name: provider.name });
  };

  // 执行确认的删除操作
  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    removeProvider(id);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col
          transition-all duration-200 ease-out
          ${contentClasses}
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">供应商管理</h2>
            {/* 配置进度 */}
            {providers.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                configuredNodes === totalNodes
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              }`}>
                {configuredNodes}/{totalNodes}
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 供应商列表区域 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
              供应商列表
            </h3>

            {/* 供应商卡片列表 */}
            {providers.length === 0 ? (
              <div className="text-center py-6 text-base-content/50">
                <Server className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无供应商，点击下方按钮添加</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-2.5 bg-base-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{provider.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-base-300 text-base-content/60 shrink-0">
                          {protocolLabels[provider.protocol] || "Google"}
                        </span>
                      </div>
                      <div className="text-xs text-base-content/40 truncate">
                        {provider.baseUrl}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={() => setEditingProvider(provider)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-square text-error"
                        onClick={() => handleDeleteProvider(provider)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加供应商按钮 */}
            <button
              className="btn btn-outline btn-sm w-full gap-2"
              onClick={() => setIsAddingProvider(true)}
            >
              <Plus className="w-4 h-4" />
              添加供应商
            </button>
          </div>

          {/* 分隔线 */}
          <div className="divider my-1"></div>

          {/* 节点配置区域 - 分组显示 */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
              节点配置
            </h3>

            {providers.length === 0 ? (
              <div className="text-center py-4 text-base-content/50 text-sm">
                请先添加供应商
              </div>
            ) : (
              <div className="space-y-2">
                {nodeGroups.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.id);
                  const GroupIcon = group.icon;
                  const compatibleProviders = getGroupCompatibleProviders(group);
                  // 该分组已配置的节点数
                  const groupConfigured = group.nodeKeys.filter(
                    (key) => nodeProviders[key] && providers.some((p) => p.id === nodeProviders[key])
                  ).length;

                  return (
                    <div key={group.id} className="rounded-xl border border-base-300 overflow-hidden">
                      {/* 分组标题栏 */}
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 bg-base-200/50 cursor-pointer select-none"
                        onClick={() => toggleGroup(group.id)}
                      >
                        {/* 折叠箭头 */}
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                        )}
                        {/* 分组图标 */}
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${group.bgClass}`}>
                          <GroupIcon className={`w-3.5 h-3.5 ${group.colorClass}`} />
                        </div>
                        {/* 分组名称 + 进度 */}
                        <span className="text-sm font-medium flex-1">{group.label}</span>
                        <span className="text-[10px] text-base-content/40">
                          {groupConfigured}/{group.nodeKeys.length}
                        </span>
                        {/* 批量分配按钮 */}
                        {compatibleProviders.length > 0 && (
                          <div
                            className="ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value=""
                              placeholder="批量分配"
                              size="xs"
                              options={compatibleProviders.map((p) => ({
                                value: p.id,
                                label: `${p.name}`,
                              }))}
                              onChange={(value) => handleBatchAssign(group, value)}
                            />
                          </div>
                        )}
                      </div>

                      {/* 节点列表（折叠时隐藏） */}
                      {!isCollapsed && (
                        <div className="px-3 py-1.5 space-y-1">
                          {group.nodeKeys.map((key) => {
                            const nodeConfig = nodeConfigMap.get(key);
                            if (!nodeConfig) return null;

                            const currentProviderId = nodeProviders[key];
                            const isConfigured = currentProviderId && providers.some((p) => p.id === currentProviderId);
                            const compatibleForNode = providers.filter((p) =>
                              NODE_ALLOWED_PROTOCOLS[key].includes(p.protocol)
                            );

                            return (
                              <div
                                key={key}
                                className="flex items-center gap-2 py-1.5"
                              >
                                {/* 配置状态指示点 */}
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isConfigured ? "bg-success" : "bg-base-content/20"
                                }`} />
                                {/* 节点名称 */}
                                <span className="text-sm text-base-content/80 w-28 shrink-0 truncate" title={nodeConfig.description}>
                                  {nodeConfig.label}
                                </span>
                                {/* 供应商选择 */}
                                <div className="flex-1 min-w-0">
                                  <Select
                                    value={currentProviderId || ""}
                                    placeholder="未配置"
                                    size="xs"
                                    options={[
                                      { value: "", label: "未配置" },
                                      ...compatibleForNode.map((p) => ({
                                        value: p.id,
                                        label: `${p.name} (${protocolLabels[p.protocol]})`,
                                      })),
                                    ]}
                                    onChange={(value) => handleNodeProviderChange(key, value)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部 - 简化为关闭按钮 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-base-300 bg-base-200/50">
          <div className="flex items-center gap-1.5 text-xs text-base-content/40">
            <Zap className="w-3 h-3" />
            <span>更改即时生效</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>

      {/* 添加/编辑供应商弹窗 */}
      {(isAddingProvider || editingProvider) && (
        <ProviderEditModal
          provider={editingProvider}
          onSave={(data) => {
            if (editingProvider) {
              updateProvider(editingProvider.id, data);
            } else {
              addProvider(data);
            }
            setEditingProvider(null);
            setIsAddingProvider(false);
          }}
          onClose={() => {
            setEditingProvider(null);
            setIsAddingProvider(false);
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <DeleteConfirmModal
          name={deleteConfirm.name}
          onConfirm={executeDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>,
    document.body
  );
}

// 供应商编辑弹窗组件
interface ProviderEditModalProps {
  provider: Provider | null;
  onSave: (data: Omit<Provider, "id">) => void;
  onClose: () => void;
}

function ProviderEditModal({ provider, onSave, onClose }: ProviderEditModalProps) {
  const [name, setName] = useState(provider?.name || "");
  const [apiKey, setApiKey] = useState(provider?.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "");
  const [protocol, setProtocol] = useState<ProviderProtocol>(provider?.protocol || "google");

  // 使用统一的 modal hook
  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen: true,
    onClose,
  });

  // 获取动画类名
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  const isEditing = !!provider;
  const canSave = name.trim() && apiKey.trim() && baseUrl.trim();

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      protocol,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
          relative bg-base-100 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden
          transition-all duration-200 ease-out
          ${contentClasses}
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-base-300">
          <h3 className="font-semibold">
            {isEditing ? "编辑供应商" : "添加供应商"}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 协议类型选择 Tab */}
        <div className="px-5 pt-4">
          <div className="flex bg-base-200 rounded-lg p-1">
            {protocolConfig.map(({ key, label }) => (
              <button
                key={key}
                className={`
                  flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors
                  ${protocol === key
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content"
                  }
                `}
                onClick={() => setProtocol(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 表单 */}
        <div className="p-5 space-y-4">
          {/* 名称 */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">名称</span>
            </label>
            <Input
              placeholder="例如：我的 API 服务"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">API Key</span>
            </label>
            <Input
              isPassword
              placeholder="输入 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Base URL */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">Base URL</span>
            </label>
            <Input
              placeholder="例如：https://api.example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <label className="label py-0.5">
              <span className="label-text-alt text-base-content/50">
                无需填写版本路径（如 /v1beta）
              </span>
            </label>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-base-300 bg-base-200/50">
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            取消
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isEditing ? "保存" : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 删除确认弹窗组件
interface DeleteConfirmModalProps {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteConfirmModal({ name, onConfirm, onClose }: DeleteConfirmModalProps) {
  // 使用统一的 modal hook
  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen: true,
    onClose,
  });

  // 获取动画类名
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
          relative bg-base-100 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5
          transition-all duration-200 ease-out
          ${contentClasses}
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-error/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-error" />
          </div>
          <h3 className="font-semibold">确认删除</h3>
        </div>
        <p className="text-sm text-base-content/70 mb-5">
          确定要删除供应商「{name}」吗？相关节点配置也会被清除，此操作不可撤销。
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
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
