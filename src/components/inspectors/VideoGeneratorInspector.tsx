import { useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, AtSign, CheckCircle2, ChevronDown, ChevronRight, Clock3, ExternalLink, Loader2, Play, Video } from "lucide-react";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Select } from "@/components/ui/Select";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { useVideoGeneratorExecution } from "@/hooks/useVideoGeneratorExecution";
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
  VideoApiProtocol,
  VideoGeneratorNodeData,
  VideoGeneratorRunRecord,
} from "@/components/nodes/videoGeneratorConfig";
import {
  getDefaultVideoGeneratorData,
  getNewApiResolutionValue,
  getNormalizedOpenAIVideoSeconds,
  getNormalizedOpenAIVideoSize,
  getOpenAIVideoSizeOptions,
  getVideoApiProtocol,
  getVideoApiProtocolConfig,
  newApiDurationOptions,
  newApiFpsOptions,
  newApiResolutionOptions,
  newApiResponseFormatOptions,
  newApiVideoCountOptions,
  type OpenAIVideoSize,
  openAIVideoSecondsOptions,
  parseVideoResolution,
  videoApiProtocolOptions,
} from "@/components/nodes/videoGeneratorConfig";

interface VideoGeneratorInspectorProps {
  nodeId: string;
  data: VideoGeneratorNodeData;
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

function getProviderNodeType(protocol: VideoApiProtocol) {
  return protocol === "newapi-video-generations" ? "newApiVideoGenerator" : "videoGenerator";
}

export function VideoGeneratorInspector({ nodeId, data }: VideoGeneratorInspectorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<ActivePromptMentionQuery | null>(null);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(() => new Set());
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const apiProtocol = getVideoApiProtocol(data);
  const config = getVideoApiProtocolConfig(apiProtocol);
  const { handleGenerate, model, validationError } = useVideoGeneratorExecution(nodeId, data);
  const dots = useLoadingDots(data.status === "loading");
  const {
    isPromptConnected,
    promptText,
    hasEmptyImageInputs,
    emptyImageLabels,
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
  const providerNodeType = getProviderNodeType(apiProtocol);

  const updateData = (updates: Partial<VideoGeneratorNodeData>) => {
    updateNodeData<VideoGeneratorNodeData>(nodeId, updates);
  };

  const handleProtocolChange = (value: string) => {
    const nextProtocol = value as VideoApiProtocol;
    const nextDefaults = getDefaultVideoGeneratorData(nextProtocol);
    updateData({
      ...nextDefaults,
      label: data.label || nextDefaults.label,
      prompt: data.prompt || nextDefaults.prompt,
      apiProtocol: nextProtocol,
      outputVideo: data.outputVideo,
      videoData: data.videoData,
      taskId: data.taskId,
      taskStage: data.taskStage,
      progress: data.progress,
      status: data.status,
      error: data.error,
      errorDetails: data.errorDetails,
      runRecords: data.runRecords,
    });
  };

  const handleModelChange = (value: string) => {
    const nextSize = value === "sora-2" && data.size && !["1280x720", "720x1280"].includes(data.size)
      ? "1280x720"
      : data.size;
    updateData({ model: value, size: nextSize });
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
        <section className="space-y-3">
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">节点提示词</label>
            <div className="relative">
              <textarea
                ref={promptTextareaRef}
                className="textarea textarea-bordered textarea-sm w-full min-h-24 resize-none"
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
              留空时将直接使用外部连接的提示词。
            </p>
          </div>

          <div>
            <label className="text-xs text-base-content/60 mb-1 block">接口规范</label>
            <Select
              value={apiProtocol}
              options={videoApiProtocolOptions}
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
            modelCategory="videoGenerator"
            mode="inline"
          />

          {config.hasOpenAIControls && (
            <>
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">视频尺寸</label>
                <Select
                  value={getNormalizedOpenAIVideoSize({ ...data, model })}
                  options={getOpenAIVideoSizeOptions(model)}
                  onChange={(value) => updateData({ size: value as OpenAIVideoSize })}
                  usePortal={false}
                />
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">视频时长</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {openAIVideoSecondsOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm px-0 ${getNormalizedOpenAIVideoSeconds(data) === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ seconds: opt.value })}
                    >
                      {opt.label.replace(" 秒", "s")}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {config.hasNewApiControls && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">分辨率</label>
                  <Select
                    value={getNewApiResolutionValue(data)}
                    options={newApiResolutionOptions}
                    onChange={(value) => {
                      const resolution = parseVideoResolution(value);
                      if (resolution) {
                        updateData({ width: resolution.width, height: resolution.height });
                      }
                    }}
                    usePortal={false}
                  />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">时长</label>
                  <Select
                    value={String(data.duration || 5)}
                    options={newApiDurationOptions}
                    onChange={(value) => updateData({ duration: Number(value) })}
                    usePortal={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">帧率</label>
                  <Select
                    value={String(data.fps || 30)}
                    options={newApiFpsOptions}
                    onChange={(value) => updateData({ fps: Number(value) })}
                    usePortal={false}
                  />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">生成数量</label>
                  <Select
                    value={String(data.n || 1)}
                    options={newApiVideoCountOptions}
                    onChange={(value) => updateData({ n: Number(value) })}
                    usePortal={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">返回格式</label>
                  <Select
                    value={data.responseFormat || "url"}
                    options={newApiResponseFormatOptions}
                    onChange={(value) => updateData({ responseFormat: value as VideoGeneratorNodeData["responseFormat"] })}
                    usePortal={false}
                  />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">Seed</label>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={data.seed ?? ""}
                    placeholder="随机"
                    onChange={(event) => updateData({
                      seed: event.target.value ? Number(event.target.value) : undefined,
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">用户标识</label>
                <input
                  className="input input-bordered input-sm w-full"
                  value={data.user || ""}
                  placeholder="可选"
                  onChange={(event) => updateData({ user: event.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">扩展参数 metadata</label>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full min-h-20 resize-none font-mono text-[11px]"
                  value={data.metadataText || ""}
                  placeholder='{"negative_prompt":"...","style":"cinematic"}'
                  onChange={(event) => updateData({ metadataText: event.target.value })}
                />
                {validationError && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className="space-y-2">
          {!hasResolvedPrompt && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>请填写节点提示词，或连接提示词节点</span>
            </div>
          )}
          {isPromptConnected && hasEmptyImageInputs && (
            <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>图片输入为空: {emptyImageLabels.join(", ")}</span>
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
          {(data.outputVideo || data.videoData) && (
            <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[var(--nc-shadow-card)]">
              <div className="flex items-center gap-2 border-b border-base-300/70 px-3 py-2">
                <Video className="h-3.5 w-3.5 text-info" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">最新输出</span>
                {data.outputVideo && (
                  <a
                    href={data.outputVideo}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-xs btn-square"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <video
                src={data.outputVideo || `data:video/mp4;base64,${data.videoData}`}
                controls
                className="aspect-video w-full bg-black"
              />
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
              运行后会在这里看到视频、输入和输出
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
          className={`btn w-full gap-2 ${data.status === "loading" || !hasResolvedPrompt || validationError ? "btn-disabled" : getButtonClass(config.accent)}`}
          onClick={handleGenerate}
          disabled={data.status === "loading" || !hasResolvedPrompt || !!validationError}
        >
          <Play className="w-4 h-4" />
          {data.status === "loading" ? `生成中${dots}` : "生成视频"}
        </button>
        <div className="mt-2 text-[11px] text-base-content/45 truncate">
          {config.label} · {providerNodeType}
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

function getRunStatusLabel(status: VideoGeneratorRunRecord["status"]) {
  if (status === "loading") return "Running";
  if (status === "success") return "Success";
  return "Failed";
}

function getRunStatusIcon(status: VideoGeneratorRunRecord["status"]) {
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
  record: VideoGeneratorRunRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const videoSrc = record.output?.videoUrl || (record.output?.videoData ? `data:video/mp4;base64,${record.output.videoData}` : undefined);

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

      {videoSrc && (
        <div className="space-y-2 border-t border-base-300/70 px-3 py-3">
          <video src={videoSrc} controls className="aspect-video w-full rounded-lg bg-black" />
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
