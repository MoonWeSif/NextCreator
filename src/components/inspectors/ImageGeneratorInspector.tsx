import { useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, AtSign, CheckCircle2, ChevronDown, ChevronRight, Clock3, Image as ImageIcon, Loader2, Maximize2, Play } from "lucide-react";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Select } from "@/components/ui/Select";
import { ErrorDetailModal } from "@/components/ui/ErrorDetailModal";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { useLoadingDots } from "@/hooks/useLoadingDots";
import { useImageGeneratorExecution } from "@/hooks/useImageGeneratorExecution";
import { useNodeConnectionStatus } from "@/hooks/useNodeConnectionStatus";
import { getImageUrl } from "@/services/fileStorageService";
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
  GptImageSize,
  ImageApiProtocol,
  ImageGeneratorNodeData,
  ImageGeneratorRunRecord,
} from "@/components/nodes/imageGeneratorConfig";
import {
  getDefaultImageGeneratorData,
  getGeminiAspectRatioOptions,
  getGeminiImageSizeOptions,
  getGptImageBackgroundOptions,
  getGptImageCustomDimensions,
  getGptImageSizeMode,
  getImageApiProtocol,
  getImageApiProtocolConfig,
  getImageGeneratorSizeLabel,
  getOpenAIImageSizeOptions,
  gptImageInputFidelityOptions,
  gptImageModerationOptions,
  gptImageOutputFormatOptions,
  gptImageQualityOptions,
  imageApiProtocolOptions,
  openAIImageCountOptions,
  supportsCustomOpenAIImageSize,
} from "@/components/nodes/imageGeneratorConfig";

interface ImageGeneratorInspectorProps {
  nodeId: string;
  data: ImageGeneratorNodeData;
}

interface RunRecordImage {
  id: string;
  imagePath?: string;
  imageData?: string;
  fileName?: string;
}

function getButtonClass(accent: string) {
  if (accent === "info") return "btn-info";
  if (accent === "warning") return "btn-warning";
  if (accent === "secondary") return "btn-secondary";
  if (accent === "error") return "btn-error";
  return "btn-primary";
}

function getModelSelectorVariant(accent: string) {
  if (accent === "info") return "info";
  if (accent === "warning") return "warning";
  return "primary";
}

export function ImageGeneratorInspector({ nodeId, data }: ImageGeneratorInspectorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<ActivePromptMentionQuery | null>(null);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(() => new Set());
  const [previewImage, setPreviewImage] = useState<{ imagePath?: string; imageData?: string; fileName?: string } | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const apiProtocol = getImageApiProtocol(data);
  const config = getImageApiProtocolConfig(apiProtocol);
  const { handleGenerate, model, resolvedSize, sizeValidationError } = useImageGeneratorExecution(nodeId, data);
  const dots = useLoadingDots(data.status === "loading");
  const {
    isPromptConnected,
    promptText,
    hasEmptyImageInputs,
    emptyImageLabels,
  } = useNodeConnectionStatus(nodeId);
  const geminiAspectRatioOptions = config.hasGeminiImageControls
    ? getGeminiAspectRatioOptions(model)
    : undefined;
  const geminiImageSizeOptions = config.hasGeminiImageControls
    ? getGeminiImageSizeOptions(model)
    : undefined;
  const openAIImageSizeOptions = config.hasOpenAIImageControls
    ? getOpenAIImageSizeOptions(model)
    : [];
  const canUseCustomOpenAISize = supportsCustomOpenAIImageSize(model);
  const sizeMode = getGptImageSizeMode(data);
  const customDimensions = getGptImageCustomDimensions(data);
  const currentGeminiAspectRatio = geminiAspectRatioOptions?.some((opt) => opt.value === data.aspectRatio)
    ? data.aspectRatio || geminiAspectRatioOptions?.[0]?.value || "1:1"
    : geminiAspectRatioOptions?.[0]?.value || "1:1";
  const currentGeminiImageSize = geminiImageSizeOptions?.some((opt) => opt.value === data.imageSize)
    ? data.imageSize
    : geminiImageSizeOptions?.[0]?.value;
  const rawSizeSelectValue = canUseCustomOpenAISize && sizeMode === "custom" ? "custom" : (data.size || "auto");
  const sizeSelectValue = openAIImageSizeOptions.some((opt) => opt.value === rawSizeSelectValue)
    ? rawSizeSelectValue
    : "auto";
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
  const resolvedSizeLabel = getImageGeneratorSizeLabel({ ...data, apiProtocol, model });
  const runRecords = data.runRecords || [];

  const updateData = (updates: Partial<ImageGeneratorNodeData>) => {
    updateNodeData<ImageGeneratorNodeData>(nodeId, updates);
  };

  const handleProtocolChange = (value: string) => {
    const nextProtocol = value as ImageApiProtocol;
    const nextDefaults = getDefaultImageGeneratorData(nextProtocol);
    updateData({
      ...nextDefaults,
      label: data.label || nextDefaults.label,
      prompt: data.prompt || nextDefaults.prompt,
      apiProtocol: nextProtocol,
      outputImage: data.outputImage,
      outputImagePath: data.outputImagePath,
      outputImages: data.outputImages,
      outputImagePaths: data.outputImagePaths,
      status: data.status,
      error: data.error,
      errorDetails: data.errorDetails,
    });
  };

  const handleModelChange = (value: string) => {
    updateData({
      model: value,
      background: value === "gpt-image-2" && data.background === "transparent" ? "auto" : data.background,
      sizeMode: supportsCustomOpenAIImageSize(value) ? data.sizeMode : "preset",
      size: supportsCustomOpenAIImageSize(value) ? data.size : "auto",
      inputFidelity: value === "gpt-image-2" ? "auto" : data.inputFidelity,
    });
  };

  const handlePromptChange = (value: string) => {
    updateData({ prompt: value });
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
                  handlePromptChange(event.target.value);
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
              options={imageApiProtocolOptions}
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
            modelCategory="imageGenerator"
            mode="inline"
          />

          {geminiAspectRatioOptions && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">画幅比例</label>
              <Select
                value={currentGeminiAspectRatio}
                options={geminiAspectRatioOptions}
                onChange={(value) => updateData({ aspectRatio: value })}
                usePortal={false}
              />
            </div>
          )}

          {config.hasGeminiImageControls && geminiImageSizeOptions && (
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">输出尺寸</label>
              <div className="grid grid-cols-4 gap-1.5">
                {geminiImageSizeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm px-0 ${currentGeminiImageSize === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                    onClick={() => updateData({ imageSize: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.hasOpenAIImageControls && (
            <>
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">尺寸/比例</label>
                <Select
                  value={sizeSelectValue}
                  options={openAIImageSizeOptions}
                  onChange={(nextValue) => {
                    const value = nextValue as GptImageSize | "custom";
                    if (value === "custom" && canUseCustomOpenAISize) {
                      updateData({
                        sizeMode: "custom",
                        customWidth: customDimensions.width,
                        customHeight: customDimensions.height,
                      });
                      return;
                    }

                    updateData({
                      sizeMode: "preset",
                      size: value === "custom" ? "auto" : value,
                    });
                  }}
                  usePortal={false}
                />
                {canUseCustomOpenAISize && sizeMode === "custom" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      min={16}
                      max={3840}
                      step={16}
                      className="input input-bordered input-sm w-full"
                      value={customDimensions.width}
                      onChange={(e) => updateData({
                        customWidth: Number(e.target.value),
                        sizeMode: "custom",
                      })}
                    />
                    <input
                      type="number"
                      min={16}
                      max={3840}
                      step={16}
                      className="input input-bordered input-sm w-full"
                      value={customDimensions.height}
                      onChange={(e) => updateData({
                        customHeight: Number(e.target.value),
                        sizeMode: "custom",
                      })}
                    />
                  </div>
                )}
                {sizeValidationError && (
                  <div className="flex items-start gap-2 text-warning text-xs bg-warning/10 p-2 rounded-lg mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{sizeValidationError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">质量</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {gptImageQualityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm px-0 ${(data.quality || "auto") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ quality: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">生成数量</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {openAIImageCountOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm px-0 ${String(data.n || 1) === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ n: Number(opt.value) })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-base-content/60 mb-1 block">背景</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {getGptImageBackgroundOptions(model).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm ${(data.background || "auto") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                      onClick={() => updateData({ background: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">格式</label>
                  <Select
                    value={data.outputFormat || "png"}
                    options={gptImageOutputFormatOptions}
                    onChange={(value) => updateData({
                      outputFormat: value as ImageGeneratorNodeData["outputFormat"],
                    })}
                    usePortal={false}
                  />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">审核</label>
                  <Select
                    value={data.moderation || "auto"}
                    options={gptImageModerationOptions}
                    onChange={(value) => updateData({
                      moderation: value as ImageGeneratorNodeData["moderation"],
                    })}
                    usePortal={false}
                  />
                </div>
              </div>

              {model !== "gpt-image-2" && (
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">参考图保真度</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {gptImageInputFidelityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`btn btn-sm ${(data.inputFidelity || "auto") === opt.value ? getButtonClass(config.accent) : "btn-ghost bg-base-200"}`}
                        onClick={() => updateData({
                          inputFidelity: opt.value as ImageGeneratorNodeData["inputFidelity"],
                        })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(data.outputFormat === "jpeg" || data.outputFormat === "webp") && (
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">
                    压缩: {data.outputCompression ?? 100}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={data.outputCompression ?? 100}
                    className="range range-xs range-info"
                    onChange={(e) => updateData({ outputCompression: Number(e.target.value) })}
                  />
                </div>
              )}
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
          {(data.outputImage || data.outputImagePath) && (
            <button
              type="button"
              className="relative group block w-full overflow-hidden rounded-lg bg-base-200"
              onClick={() => setShowPreview(true)}
            >
              <img
                src={data.outputImagePath ? getImageUrl(data.outputImagePath) : `data:image/png;base64,${data.outputImage}`}
                alt="Generated"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </button>
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
                  onPreviewImage={(image) => setPreviewImage(image)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-base-300 bg-base-200/35 px-3 py-6 text-center text-xs text-base-content/45">
              运行后会在这里看到图片、输入和输出
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
          className={`btn w-full gap-2 ${data.status === "loading" || !hasResolvedPrompt || sizeValidationError ? "btn-disabled" : getButtonClass(config.accent)}`}
          onClick={handleGenerate}
          disabled={data.status === "loading" || !hasResolvedPrompt || !!sizeValidationError}
        >
          <Play className="w-4 h-4" />
          {data.status === "loading" ? `生成中${dots}` : "生成图片"}
        </button>
        <div className="mt-2 text-[11px] text-base-content/45 truncate">
          {config.label} · {config.hasOpenAIImageControls ? resolvedSize : resolvedSizeLabel}
        </div>
      </div>

      {showPreview && (data.outputImage || data.outputImagePath) && (
        <ImagePreviewModal
          imageData={data.outputImage}
          imagePath={data.outputImagePath}
          onClose={() => setShowPreview(false)}
        />
      )}
      {previewImage && (
        <ImagePreviewModal
          imageData={previewImage.imageData}
          imagePath={previewImage.imagePath}
          fileName={previewImage.fileName}
          onClose={() => setPreviewImage(null)}
        />
      )}
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

function getRunStatusLabel(status: ImageGeneratorRunRecord["status"]) {
  if (status === "loading") return "Running";
  if (status === "success") return "Success";
  return "Failed";
}

function getRunImages(record: ImageGeneratorRunRecord): RunRecordImage[] {
  const pathImages = record.output?.imagePaths?.map((imagePath, index) => ({
    id: `${record.id}-path-${index}`,
    imagePath,
    fileName: `output-${index + 1}.png`,
  })) || [];
  const inlineImages = record.output?.imageDataList?.map((imageData, index) => ({
    id: `${record.id}-data-${index}`,
    imageData,
    fileName: `output-${index + 1}.png`,
  })) || [];

  return [...pathImages, ...inlineImages];
}

function getRunStatusIcon(status: ImageGeneratorRunRecord["status"]) {
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

interface RunRecordCardProps {
  record: ImageGeneratorRunRecord;
  expanded: boolean;
  onToggle: () => void;
  onPreviewImage: (image: { imagePath?: string; imageData?: string; fileName?: string }) => void;
}

function RunRecordCard({ record, expanded, onToggle, onPreviewImage }: RunRecordCardProps) {
  const images = getRunImages(record);

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
            <span className="flex-shrink-0 text-[11px] text-base-content/40">{record.operation}</span>
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

      {images.length > 0 && (
        <div className="space-y-2 border-t border-base-300/70 px-3 py-3">
          {images.map((image, index) => {
            const imageSrc = image.imagePath ? getImageUrl(image.imagePath) : `data:image/png;base64,${image.imageData}`;
            return (
              <button
                key={image.id}
                type="button"
                className="group w-full overflow-hidden rounded-lg border border-base-300 bg-base-200 text-left"
                onClick={() => onPreviewImage(image)}
              >
                <div className="flex items-center gap-2 border-b border-base-300/70 bg-base-100 px-2.5 py-2">
                  <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-info" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {image.fileName || `生成图片 ${index + 1}`}
                  </span>
                  <Maximize2 className="h-3.5 w-3.5 flex-shrink-0 text-base-content/35 group-hover:text-base-content/60" />
                </div>
                <img
                  src={imageSrc}
                  alt={image.fileName || `Generated ${index + 1}`}
                  className="aspect-video w-full object-cover"
                />
              </button>
            );
          })}
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
