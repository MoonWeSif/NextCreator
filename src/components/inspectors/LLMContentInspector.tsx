import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Select } from "@/components/ui/Select";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useLLMContentExecution } from "@/hooks/useLLMContentExecution";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { useFlowStore } from "@/stores/flowStore";
import {
  filterPromptMentionSources,
  getActivePromptMentionQuery,
  getMentionPreview,
  getPromptMentionSourcesForNode,
  tokenizePromptMentions,
  type ActivePromptMentionQuery,
  type PromptMentionSource,
} from "@/utils/promptMentions";
import type {
  LLMApiProtocol,
  LLMContentNodeData,
  LLMContentRunRecord,
  LLMResponseFormat,
} from "@/components/nodes/llmContentConfig";
import {
  getDefaultLLMContentData,
  getLLMApiProtocol,
  getLLMApiProtocolConfig,
  getLLMParameterLabels,
  llmApiProtocolOptions,
  llmResponseFormatOptions,
} from "@/components/nodes/llmContentConfig";

interface LLMContentInspectorProps {
  nodeId: string;
  data: LLMContentNodeData;
}

function getButtonClass(accent: string) {
  if (accent === "info") return "btn-info";
  if (accent === "warning") return "btn-warning";
  return "btn-primary";
}

function getModelSelectorVariant(accent: string) {
  if (accent === "info") return "info";
  if (accent === "warning") return "warning";
  return "primary";
}

export function LLMContentInspector({ nodeId, data }: LLMContentInspectorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<ActivePromptMentionQuery | null>(null);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState(false);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const apiProtocol = getLLMApiProtocol(data);
  const config = getLLMApiProtocolConfig(apiProtocol);
  const { handleGenerate, model, validationError } = useLLMContentExecution(nodeId, data);
  const dots = useLoadingDots(data.status === "loading");
  const {
    isPromptConnected,
    promptText,
    hasEmptyImageInputs,
    emptyImageLabels,
    hasEmptyFileInputs,
    emptyFileLabels,
  } = useNodeConnectionStatus(nodeId);
  const mentionSources = useMemo(
    () => getPromptMentionSourcesForNode(nodes, edges, nodeId),
    [nodes, edges, nodeId]
  );
  const mentionOptions = mentionQuery
    ? filterPromptMentionSources(mentionSources, mentionQuery.query)
    : [];
  const promptTokens = useMemo(
    () => tokenizePromptMentions(data.prompt || "", mentionSources),
    [data.prompt, mentionSources]
  );
  const promptValue = data.prompt || "";
  const hasPromptValue = promptValue.trim().length > 0;
  const hasResolvedPrompt = hasPromptValue || Boolean(promptText?.trim());
  const runRecords = data.runRecords || [];
  const parameterLabels = getLLMParameterLabels(data);

  const updateData = (updates: Partial<LLMContentNodeData>) => {
    updateNodeData<LLMContentNodeData>(nodeId, updates);
  };

  const handleProtocolChange = (value: string) => {
    const nextProtocol = value as LLMApiProtocol;
    const nextDefaults = getDefaultLLMContentData(nextProtocol);
    updateData({
      ...nextDefaults,
      label: data.label || nextDefaults.label,
      prompt: data.prompt || nextDefaults.prompt,
      apiProtocol: nextProtocol,
      systemPrompt: data.systemPrompt || nextDefaults.systemPrompt,
      outputContent: data.outputContent,
      status: data.status,
      error: data.error,
      errorDetails: data.errorDetails,
      runRecords: data.runRecords,
    });
  };

  const handleModelChange = (value: string) => {
    updateData({ model: value });
  };

  const updateMentionQuery = (value: string, caretPosition: number) => {
    setMentionQuery(getActivePromptMentionQuery(value, caretPosition));
  };

  const insertMention = (source: PromptMentionSource) => {
    const currentQuery = mentionQuery;
    if (!currentQuery) return;

    const mentionText = `@${source.label}`;
    const nextPrompt = `${promptValue.slice(0, currentQuery.start)}${mentionText} ${promptValue.slice(currentQuery.end)}`;
    const nextCaret = currentQuery.start + mentionText.length + 1;
    updateData({ prompt: nextPrompt });
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const textarea = promptTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleCopyOutput = async () => {
    if (!data.outputContent) return;
    await navigator.clipboard.writeText(data.outputContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        <section className="space-y-3">
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">节点提示词</label>
            <div className="relative">
              <textarea
                ref={promptTextareaRef}
                className="textarea textarea-bordered textarea-sm w-full min-h-28 resize-none"
                value={data.prompt || ""}
                placeholder="可直接写提示词，也可输入 @ 引用已连接提示词"
                onChange={(event) => {
                  updateData({ prompt: event.target.value });
                  updateMentionQuery(event.target.value, event.target.selectionStart ?? event.target.value.length);
                }}
                onClick={(event) => updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                onKeyUp={(event) => updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setMentionQuery(null);
                    return;
                  }
                  if ((event.key === "Enter" || event.key === "Tab") && mentionOptions[0]) {
                    event.preventDefault();
                    insertMention(mentionOptions[0]);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setMentionQuery(null), 120);
                }}
              />
              {mentionQuery && (
                <div className="nc-image-mention-menu">
                  {mentionOptions.length > 0 ? (
                    mentionOptions.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className="nc-image-mention-option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertMention(source)}
                      >
                        <AtSign className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium">{source.label}</span>
                          <span className="block truncate text-[11px] text-base-content/45">
                            {getMentionPreview(source.content)}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-base-content/45">
                      没有可引用的提示词节点
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-base-content/40">
              留空时将使用外部连接的提示词；两者同时存在时会合并。
            </p>
          </div>

          <div>
            <label className="text-xs text-base-content/60 mb-1 block">接口规范</label>
            <Select
              value={apiProtocol}
              options={llmApiProtocolOptions}
              onChange={handleProtocolChange}
              usePortal={false}
            />
          </div>

          <ModelSelector
            value={model}
            options={config.presetModels}
            onChange={handleModelChange}
            variant={getModelSelectorVariant(config.accent)}
            allowCustom={true}
            modelCategory="llmContent"
            mode="inline"
          />

          <div>
            <label className="text-xs text-base-content/60 mb-1 block">系统提示词</label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full min-h-20 resize-none"
              value={data.systemPrompt || ""}
              placeholder={apiProtocol === "claude-messages" ? "Claude 使用顶层 system 字段" : "可选"}
              onChange={(event) => updateData({ systemPrompt: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">温度</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                className="input input-bordered input-sm w-full"
                value={Number.isFinite(data.temperature) ? data.temperature : 0.7}
                onChange={(event) => updateData({ temperature: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">最大输出</label>
              <input
                type="number"
                min="1"
                step="1"
                className="input input-bordered input-sm w-full"
                value={data.maxTokens || 4096}
                onChange={(event) => updateData({ maxTokens: Number(event.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-base-content/60 mb-1 block">返回格式</label>
            <Select
              value={data.responseFormat || "text"}
              options={
                config.supportsJsonSchema
                  ? llmResponseFormatOptions
                  : llmResponseFormatOptions.filter((opt) => opt.value === "text")
              }
              onChange={(value) => updateData({ responseFormat: value as LLMResponseFormat })}
              usePortal={false}
            />
          </div>

          {data.responseFormat === "json_schema" && config.supportsJsonSchema && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">JSON Schema</label>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full min-h-28 resize-none font-mono text-[11px]"
                value={data.responseJsonSchemaText || ""}
                placeholder='{"type":"object","properties":{"title":{"type":"string"}},"required":["title"]}'
                onChange={(event) => updateData({ responseJsonSchemaText: event.target.value })}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {parameterLabels.map((label) => (
              <span key={label} className="nc-image-parameter-chip">
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          {!hasResolvedPrompt && !isPromptConnected && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>请填写节点提示词，或连接提示词节点</span>
            </div>
          )}
          {(hasEmptyImageInputs || hasEmptyFileInputs) && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                输入为空: {[...emptyImageLabels, ...emptyFileLabels].join(", ")}
              </span>
            </div>
          )}
          {validationError && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}
          {data.status === "error" && data.error && (
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left text-error text-xs bg-error/10 p-2 rounded-lg hover:bg-error/20"
              onClick={() => setShowErrorDetail(true)}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-4 break-all">{data.error}</span>
            </button>
          )}
          {data.outputContent && (
            <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[var(--nc-shadow-card)]">
              <div className="flex items-center gap-2 border-b border-base-300/70 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">最新输出</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={handleCopyOutput}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <div className="prose prose-sm max-w-none p-3 text-sm leading-6">
                <ReactMarkdown>{data.outputContent}</ReactMarkdown>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">输出</h3>
            <span className="text-[11px] text-base-content/40">{runRecords.length} 次调用</span>
          </div>
          {runRecords.length > 0 ? (
            <div className="space-y-2.5">
              {runRecords.map((record) => (
                <RunRecordCard
                  key={record.id}
                  record={record}
                  expanded={expandedRunIds.has(record.id)}
                  onToggle={() => {
                    setExpandedRunIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(record.id)) {
                        next.delete(record.id);
                      } else {
                        next.add(record.id);
                      }
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-base-300 bg-base-200/35 px-3 py-6 text-center text-xs text-base-content/45">
              运行后会在这里看到输入、输出和调用记录
            </div>
          )}
        </section>
      </div>

      {hasPromptValue && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-xs text-base-content/70">
            {promptTokens.map((token, index) =>
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
            )}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 border-t border-base-300 bg-base-100 p-4">
        <button
          type="button"
          className={`btn w-full gap-2 ${data.status === "loading" || (!hasResolvedPrompt && !isPromptConnected) || validationError ? "btn-disabled" : getButtonClass(config.accent)}`}
          onClick={handleGenerate}
          disabled={data.status === "loading" || (!hasResolvedPrompt && !isPromptConnected) || !!validationError}
        >
          <Play className="w-4 h-4" />
          {data.status === "loading" ? `生成中${dots}` : "生成内容"}
        </button>
        <div className="mt-2 text-[11px] text-base-content/45 truncate">
          {config.label} · {config.providerProtocol}
        </div>
      </div>

      {showErrorDetail && data.error && (
        <ErrorDetailModal
          error={data.error}
          errorDetails={data.errorDetails}
          title="执行错误"
          onClose={() => setShowErrorDetail(false)}
        />
      )}
    </div>
  );
}

function formatRunTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(durationMs?: number) {
  if (durationMs == null) return "运行中";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function getRunStatusLabel(status: LLMContentRunRecord["status"]) {
  if (status === "loading") return "Running";
  if (status === "success") return "Success";
  return "Failed";
}

function getRunStatusIcon(status: LLMContentRunRecord["status"]) {
  if (status === "loading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />;
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  return <AlertCircle className="h-3.5 w-3.5 text-error" />;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="nc-scrollbar-none max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-base-200/80 p-3 text-[11px] leading-5 text-base-content/70">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function RunRecordCard({
  record,
  expanded,
  onToggle,
}: {
  record: LLMContentRunRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[var(--nc-shadow-card)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-base-200/45"
        onClick={onToggle}
      >
        {getRunStatusIcon(record.status)}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">{record.modelLabel}</span>
            <span className="flex-shrink-0 text-[11px] text-base-content/40">{record.protocolLabel}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-base-content/45">
            <Clock3 className="h-3 w-3" />
            <span>{formatRunTime(record.startedAt)}</span>
            <span>{formatDuration(record.durationMs)}</span>
          </div>
        </div>
        <span className="text-[11px] text-base-content/45">{getRunStatusLabel(record.status)}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-base-content/45" />
        ) : (
          <ChevronRight className="h-4 w-4 text-base-content/45" />
        )}
      </button>

      {record.error && (
        <div className="mx-3 mb-2 rounded-lg bg-error/10 px-3 py-2 text-xs leading-5 text-error">
          {record.error}
        </div>
      )}

      {record.output?.content && (
        <div className="border-t border-base-300/70 px-3 py-3">
          <div className="line-clamp-5 whitespace-pre-wrap rounded-lg bg-base-200/55 p-3 text-xs leading-5 text-base-content/70">
            {record.output.content}
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-base-300/70 px-3 py-3">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-base-content/70">Input</div>
            <JsonBlock value={record.input} />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-base-content/70">Output</div>
            <JsonBlock value={record.output?.metadata || record.output || { success: record.status === "success", error: record.error }} />
          </div>
        </div>
      )}
    </div>
  );
}

