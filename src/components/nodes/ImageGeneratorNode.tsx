import { memo, useMemo } from "react";
import { type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Image as ImageIconBase,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { useImageGeneratorExecution } from "@/hooks/useImageGeneratorExecution";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { useFlowStore } from "@/stores/flowStore";
import {
  getPromptMentionSourcesForNode,
  tokenizePromptMentions,
} from "@/utils/promptMentions";
import {
  isImageInputEdge,
  isPromptInputEdge,
} from "@/utils/connectionHandles";
import type { CustomEdge, CustomNode } from "@/types";
import type {
  ImageGeneratorNodeData,
  ImageGeneratorNode as ImageGeneratorNodeType,
} from "./imageGeneratorConfig";
import {
  getImageApiProtocolConfig,
  getImageGeneratorParameterLabels,
  getImageModelDisplayName,
} from "./imageGeneratorConfig";

function getNodeAccentClass(accent: string) {
  if (accent === "info") return "nc-node-accent-cyan";
  if (accent === "warning") return "nc-node-accent-orange";
  if (accent === "secondary") return "nc-node-accent-pink";
  if (accent === "error") return "nc-node-accent-orange";
  return "nc-node-accent-blue";
}

function getStatusLabel(status: ImageGeneratorNodeData["status"]) {
  switch (status) {
    case "loading":
      return "Running";
    case "success":
      return "Success";
    case "error":
      return "Failed";
    default:
      return "Idle";
  }
}

interface ConnectedInputSource {
  id: string;
  label: string;
}

function getNodeDisplayLabel(node: CustomNode) {
  const rawLabel = typeof node.data.label === "string" ? node.data.label.trim() : "";
  if (rawLabel) return rawLabel;

  switch (node.type) {
    case "promptNode":
      return "提示词";
    case "llmContentNode":
      return "LLM 内容";
    case "imageInputNode":
      return "参考图";
    case "imageGeneratorNode":
      return "绘图生成";
    case "fileUploadNode":
      return "文件上传";
    default:
      return `节点 ${node.id.slice(0, 4)}`;
  }
}

function getConnectedInputSources(
  nodes: CustomNode[],
  edges: CustomEdge[],
  nodeId: string
): ConnectedInputSource[] {
  const sources: ConnectedInputSource[] = [];
  const seenSourceIds = new Set<string>();

  for (const edge of edges) {
    if (edge.target !== nodeId) continue;

    const sourceNode = nodes.find((node) => node.id === edge.source);
    if (!sourceNode) continue;
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (seenSourceIds.has(sourceNode.id)) continue;

    const isRelevantInput =
      isPromptInputEdge(edge, sourceNode, targetNode) ||
      isImageInputEdge(edge, sourceNode, targetNode);

    if (!isRelevantInput) continue;

    seenSourceIds.add(sourceNode.id);
    sources.push({
      id: sourceNode.id,
      label: getNodeDisplayLabel(sourceNode),
    });
  }

  return sources;
}

function ImageGeneratorNodeBase({ id, data, selected }: NodeProps<ImageGeneratorNodeType>) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const isOverlay = data.__renderOverlay === true;

  const config = getImageApiProtocolConfig(data);
  const modelLabel = getImageModelDisplayName(data);
  const parameterLabels = getImageGeneratorParameterLabels(data);
  const { handleGenerate, sizeValidationError } = useImageGeneratorExecution(id, data);
  const {
    isPromptConnected,
    promptText,
    hasEmptyImageInputs,
  } = useNodeConnectionStatus(id);
  const statusLabel = getStatusLabel(data.status);
  const hasOutput = Boolean(data.outputImage || data.outputImagePath);
  const inlinePrompt = data.prompt || "";
  const mentionSources = useMemo(
    () => getPromptMentionSourcesForNode(nodes, edges, id),
    [nodes, edges, id]
  );
  const promptTokens = useMemo(
    () => tokenizePromptMentions(inlinePrompt || "", mentionSources),
    [inlinePrompt, mentionSources]
  );
  const hasInlinePrompt = inlinePrompt.trim().length > 0;
  const hasResolvedPrompt = hasInlinePrompt || Boolean(promptText?.trim());
  const canRun = hasResolvedPrompt && data.status !== "loading" && !sizeValidationError;
  const inputSources = useMemo(
    () => getConnectedInputSources(nodes, edges, id),
    [nodes, edges, id]
  );
  const connectedPrompt = promptText?.trim();

  return (
    <div className={`${getNodeAccentClass(config.accent)} w-[360px]`}>
      <div
        className={`
          nc-node-card nc-image-info-node transition-all
          ${selected ? "nc-node-card-selected" : ""}
        `}
      >
        <div className="nc-image-info-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="nc-node-header-icon">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="truncate text-[15px] font-semibold">{data.label || "绘图生成"}</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {!hasResolvedPrompt && (
              <div>
                <CircleAlert className="w-4 h-4 text-warning" />
              </div>
            )}
            {isPromptConnected && hasEmptyImageInputs && (
              <div>
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
            )}
            {data.status === "loading" && <Loader2 className="w-4 h-4 animate-spin text-info" />}
            {hasOutput && <ImageIconBase className="w-4 h-4 text-success" />}
            {!isOverlay && (
              <button
                type="button"
                className={`nodrag nc-node-run-button ${data.status === "loading" ? "nc-node-run-button-loading" : ""}`}
                disabled={!canRun}
                aria-label={data.status === "success" ? "重新运行此节点" : "运行此节点"}
                onClick={(event) => {
                  event.stopPropagation();
                  if (canRun) {
                    void handleGenerate();
                  }
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {data.status === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="space-y-2 text-sm">
            <PromptInfoRow
              hasInlinePrompt={hasInlinePrompt}
              connectedPrompt={connectedPrompt}
              promptTokens={promptTokens}
            />
            <InfoRow label="协议" value={config.label} chipClassName="nc-image-node-chip-neutral" />
            <InfoRow label="模型" value={modelLabel} chipClassName="nc-image-node-chip-primary" />
            <InputInfoRow sources={inputSources} />
            <ParameterInfoRow labels={parameterLabels} />
          </div>
        </div>

      </div>

      {data.status !== "idle" && (
        <div className={`nc-node-run-feedback nc-node-run-feedback-${data.status}`}>
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={`nodrag flex min-w-0 flex-1 items-center gap-2 text-left ${data.status === "error" && data.error ? "cursor-pointer" : "cursor-default"}`}
              onClick={(event) => {
                event.stopPropagation();
                if (data.status === "error" && data.error) {
                  setSelectedNode(id);
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={data.status === "error" && data.error ? "在右侧查看错误详情" : statusLabel}
            >
              {data.status === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
              ) : data.status === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <CircleAlert className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate text-xs font-medium">{statusLabel}</span>
              {data.status === "error" && data.error && (
                <span className="min-w-0 flex-1 truncate text-xs opacity-75">{data.error}</span>
              )}
            </button>
            <div className="flex flex-shrink-0 items-center gap-2 text-[11px] opacity-70">
              {data.status === "success" && (
                <span>{getOutputCountLabel(data)}</span>
              )}
              {data.status === "error" && data.error && (
                <span className="nc-node-error-detail-hint">查看详情</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getOutputCountLabel(data: ImageGeneratorNodeData) {
  const count = data.outputImagePaths?.length || data.outputImages?.length || (data.outputImage || data.outputImagePath ? 1 : 0);
  if (count > 0) return `${count} 张`;
  return "已完成";
}

interface PromptInfoRowProps {
  hasInlinePrompt: boolean;
  connectedPrompt?: string;
  promptTokens: ReturnType<typeof tokenizePromptMentions>;
}

function PromptInfoRow({ hasInlinePrompt, connectedPrompt, promptTokens }: PromptInfoRowProps) {
  const hasPromptPreview = hasInlinePrompt || Boolean(connectedPrompt);

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-12 flex-shrink-0 pt-1 text-[12px] text-base-content/45">Prompt:</span>
      <div className={`nc-image-prompt-preview-chip ${hasPromptPreview ? "" : "nc-image-prompt-preview-empty"}`}>
        {hasInlinePrompt ? (
          promptTokens.map((token, index) =>
            token.type === "mention" ? (
              <span
                key={`${token.text}-${index}`}
                className="nc-image-mention-chip"
              >
                {token.text}
              </span>
            ) : (
              <span key={`${token.text}-${index}`}>{token.text}</span>
            )
          )
        ) : (
          <span>{connectedPrompt || "右侧填写或连接提示词"}</span>
        )}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  chipClassName: string;
}

function InfoRow({ label, value, chipClassName }: InfoRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-12 flex-shrink-0 text-[12px] text-base-content/45">{label}:</span>
      <span className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 leading-none ${chipClassName}`}>
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

interface ParameterInfoRowProps {
  labels: string[];
}

function ParameterInfoRow({ labels }: ParameterInfoRowProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-12 flex-shrink-0 pt-1 text-[12px] text-base-content/45">参数:</span>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {labels.length > 0 ? (
          labels.map((label) => (
            <span key={label} className="nc-image-parameter-chip">
              {label}
            </span>
          ))
        ) : (
          <span className="nc-image-parameter-chip nc-image-parameter-chip-empty">
            自动
          </span>
        )}
      </div>
    </div>
  );
}

interface InputInfoRowProps {
  sources: ConnectedInputSource[];
}

function InputInfoRow({ sources }: InputInfoRowProps) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-12 flex-shrink-0 pt-1 text-[12px] text-base-content/45">Input:</span>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {sources.length > 0 ? (
          sources.map((source) => (
            <span key={source.id} className="nc-image-input-source-chip">
              {source.label}
            </span>
          ))
        ) : (
          <span className="nc-image-input-source-chip nc-image-input-source-chip-empty">
            未连接
          </span>
        )}
      </div>
    </div>
  );
}

export const ImageGeneratorNode = memo(ImageGeneratorNodeBase);
ImageGeneratorNode.displayName = "ImageGeneratorNode";

export function getImageGeneratorInspectorSummary(data: ImageGeneratorNodeData) {
  const config = getImageApiProtocolConfig(data);
  return {
    protocolLabel: config.label,
    modelLabel: getImageModelDisplayName(data),
    parameterLabels: getImageGeneratorParameterLabels(data),
  };
}
