import type { CustomEdge, CustomNode } from "@/types";
import { isPromptInputEdge as isPromptConnectionEdge } from "@/utils/connectionHandles";

export interface PromptMentionSource {
  id: string;
  label: string;
  content: string;
  kind: "prompt" | "llm";
}

export type PromptMentionToken =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; source: PromptMentionSource };

export interface ActivePromptMentionQuery {
  start: number;
  end: number;
  query: string;
}

function normalizeMentionLabel(label: unknown, fallback: string) {
  const value = typeof label === "string" ? label : fallback;
  return value.trim().replace(/^@+/, "") || fallback;
}

function isMentionBoundary(char: string | undefined) {
  return !char || /\s/.test(char) || /[.,!?;:，。！？；：、()[\]{}"'“”‘’<>《》]/.test(char);
}

function getPromptLikeContent(node: CustomNode): PromptMentionSource | null {
  if (node.type === "promptNode") {
    const data = node.data as { label?: string; prompt?: string };
    return {
      id: node.id,
      label: normalizeMentionLabel(data.label, `提示词-${node.id.slice(0, 4)}`),
      content: data.prompt || "",
      kind: "prompt",
    };
  }

  if (node.type === "llmContentNode") {
    const data = node.data as { label?: string; outputContent?: string };
    return {
      id: node.id,
      label: normalizeMentionLabel(data.label, `内容-${node.id.slice(0, 4)}`),
      content: data.outputContent || "",
      kind: "llm",
    };
  }

  return null;
}

export function getPromptMentionSourcesForNode(
  nodes: CustomNode[],
  edges: CustomEdge[],
  nodeId: string
): PromptMentionSource[] {
  const sources = new Map<string, PromptMentionSource>();
  const incomingEdges = edges.filter((edge) => edge.target === nodeId);

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (!sourceNode || !isPromptConnectionEdge(edge, sourceNode, targetNode)) continue;

    const source = getPromptLikeContent(sourceNode);
    if (source) {
      sources.set(source.id, source);
    }
  }

  const sourceList = [...sources.values()];
  const labelCounts = sourceList.reduce<Record<string, number>>((counts, source) => {
    counts[source.label] = (counts[source.label] || 0) + 1;
    return counts;
  }, {});

  return sourceList.map((source) => {
    if (labelCounts[source.label] === 1) return source;
    return {
      ...source,
      label: `${source.label} ${source.id.slice(0, 4)}`,
    };
  });
}

export function getActivePromptMentionQuery(
  text: string,
  caretPosition: number
): ActivePromptMentionQuery | null {
  const safeCaret = Math.max(0, Math.min(caretPosition, text.length));
  const beforeCaret = text.slice(0, safeCaret);
  const mentionStart = beforeCaret.lastIndexOf("@");
  if (mentionStart < 0) return null;

  const query = beforeCaret.slice(mentionStart + 1);
  if (/\s/.test(query) || query.length > 48) return null;

  return {
    start: mentionStart,
    end: safeCaret,
    query,
  };
}

export function filterPromptMentionSources(
  sources: PromptMentionSource[],
  query: string
): PromptMentionSource[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? sources.filter((source) => {
        const haystack = `${source.label} ${source.content}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : sources;

  return filtered.slice(0, 8);
}

export function tokenizePromptMentions(
  text: string,
  sources: PromptMentionSource[]
): PromptMentionToken[] {
  if (!text) return [];

  const sortedSources = [...sources]
    .filter((source) => source.label)
    .sort((a, b) => b.label.length - a.label.length);
  const tokens: PromptMentionToken[] = [];
  let buffer = "";
  let index = 0;

  const flushText = () => {
    if (!buffer) return;
    tokens.push({ type: "text", text: buffer });
    buffer = "";
  };

  while (index < text.length) {
    if (text[index] !== "@") {
      buffer += text[index];
      index += 1;
      continue;
    }

    const matchedSource = sortedSources.find((source) => {
      const mentionText = `@${source.label}`;
      return text.startsWith(mentionText, index) && isMentionBoundary(text[index + mentionText.length]);
    });

    if (!matchedSource) {
      buffer += text[index];
      index += 1;
      continue;
    }

    flushText();
    tokens.push({
      type: "mention",
      text: `@${matchedSource.label}`,
      source: matchedSource,
    });
    index += matchedSource.label.length + 1;
  }

  flushText();
  return tokens;
}

export function resolvePromptMentions(text: string, sources: PromptMentionSource[]) {
  return tokenizePromptMentions(text, sources)
    .map((token) => token.type === "mention" ? token.source.content.trim() : token.text)
    .join("")
    .trim();
}

export function buildImageGeneratorPrompt(
  inlinePrompt: string | undefined,
  connectedPrompt: string | undefined,
  sources: PromptMentionSource[]
) {
  const trimmedInlinePrompt = inlinePrompt?.trim();
  if (trimmedInlinePrompt) {
    return resolvePromptMentions(trimmedInlinePrompt, sources) || trimmedInlinePrompt;
  }

  return connectedPrompt?.trim();
}

export function getMentionPreview(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "这个提示词节点暂时为空";
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
}
