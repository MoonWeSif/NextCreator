import { X, Settings2, CircleAlert } from "lucide-react";
import { ImageGeneratorInspector } from "@/components/inspectors/ImageGeneratorInspector";
import { LLMContentInspector } from "@/components/inspectors/LLMContentInspector";
import { VideoGeneratorInspector } from "@/components/inspectors/VideoGeneratorInspector";
import { nodeCategories, nodeIconMap, nodeIconColors } from "@/config/nodeConfig";
import { useFlowStore } from "@/stores/flowStore";
import type { CustomNode, CustomNodeData, ImageGeneratorNodeData, LLMContentNodeData, VideoGeneratorNodeData } from "@/types";

function findNodeDefinition(type?: string) {
  if (!type) return undefined;
  for (const category of nodeCategories) {
    const node = category.nodes.find((item) => item.type === type);
    if (node) return node;
  }
  return undefined;
}

function getStatus(data: CustomNodeData) {
  const status = "status" in data ? data.status : undefined;
  return typeof status === "string" ? status : undefined;
}

function getError(data: CustomNodeData) {
  const error = "error" in data ? data.error : undefined;
  return typeof error === "string" ? error : undefined;
}

function GenericInspector({ node }: { node: CustomNode }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const status = getStatus(node.data);
  const error = getError(node.data);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <label className="text-xs text-base-content/60 mb-1 block">名称</label>
        <input
          className="input input-bordered input-sm w-full"
          value={String(node.data.label || "")}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value } as Partial<CustomNodeData>)}
        />
      </div>

      {status && (
        <div>
          <label className="text-xs text-base-content/60 mb-1 block">状态</label>
          <div className="rounded-lg bg-base-200 px-3 py-2 text-sm">{status}</div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-all">{error}</span>
        </div>
      )}
    </div>
  );
}

export function NodeInspector() {
  const nodes = useFlowStore((s) => s.nodes);
  const selectedNodeIds = useFlowStore((s) => s.selectedNodeIds);
  const clearSelection = useFlowStore((s) => s.clearSelection);

  if (selectedNodeIds.length !== 1) {
    return null;
  }

  const selectedNode = nodes.find((node) => node.id === selectedNodeIds[0]);
  if (!selectedNode) {
    return null;
  }

  const definition = findNodeDefinition(selectedNode.type);
  const Icon = definition?.icon ? nodeIconMap[definition.icon] : Settings2;
  const iconColor = definition?.icon ? nodeIconColors[definition.icon] : "bg-base-200 text-base-content";
  const title = String(selectedNode.data.label || definition?.label || "节点");

  return (
    <aside className="w-[360px] min-w-[360px] h-full min-h-0 bg-base-100 border-l border-base-300 flex flex-col shadow-[var(--nc-shadow-card)] z-10">
      <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3 border-b border-base-300">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-[inset_0_0_0_1px_var(--nc-border)] ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{title}</div>
          <div className="text-xs text-base-content/45 truncate">{definition?.label || selectedNode.type}</div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle"
          onClick={clearSelection}
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {selectedNode.type === "imageGeneratorNode" ? (
          <ImageGeneratorInspector
            nodeId={selectedNode.id}
            data={selectedNode.data as ImageGeneratorNodeData}
          />
        ) : selectedNode.type === "videoGeneratorNode" ? (
          <VideoGeneratorInspector
            nodeId={selectedNode.id}
            data={selectedNode.data as VideoGeneratorNodeData}
          />
        ) : selectedNode.type === "llmContentNode" ? (
          <LLMContentInspector
            nodeId={selectedNode.id}
            data={selectedNode.data as LLMContentNodeData}
          />
        ) : (
          <GenericInspector node={selectedNode} />
        )}
      </div>
    </aside>
  );
}
