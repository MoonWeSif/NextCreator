import type { CSSProperties } from "react";
import { Position, type Node, type Viewport } from "@xyflow/react";

import { getOverlayNodeDescriptor } from "./overlayNodeRegistry";
import type { CustomNodeData } from "@/types";

type CustomNode = Node<CustomNodeData>;

interface OverlayNodeLayerProps {
  nodes: CustomNode[];
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  viewport: Viewport;
}

export function OverlayNodeLayer({
  nodes,
  selectedNodeIds,
  hoveredNodeId,
  viewport,
}: OverlayNodeLayerProps) {
  const selectedNodeSet = new Set(selectedNodeIds);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {nodes.map((node) => {
        const descriptor = getOverlayNodeDescriptor(node.type);
        if (!descriptor) {
          return null;
        }

        const width = descriptor.size.width;
        const height = descriptor.size.height;
        const selected = selectedNodeSet.has(node.id);
        const hovered = hoveredNodeId === node.id;
        const Renderer = descriptor.render;

        return (
          <div
            key={node.id}
            className="canvas-node-overlay-item absolute"
            style={{
              left: Math.round(node.position.x * viewport.zoom + viewport.x),
              top: Math.round(node.position.y * viewport.zoom + viewport.y),
              width: Math.round(width * viewport.zoom),
              height: Math.round(height * viewport.zoom),
              zIndex: selected || hovered ? 20 : 10,
              "--canvas-node-zoom": viewport.zoom,
              "--canvas-node-width": `${width}px`,
              "--canvas-node-height": `${height}px`,
            } as CSSProperties}
          >
            <div className="canvas-node-overlay-scale">
              <div className="relative">
                {descriptor.showHandleMarkers !== false &&
                  descriptor.handles.filter((handle) => handle.showMarker !== false).map((handle) => (
                    <div key={`${handle.type}-${handle.id}`}>
                      <div
                        className={`canvas-node-overlay-handle absolute ${
                          handle.position === Position.Left
                            ? "canvas-node-overlay-handle-left"
                            : handle.position === Position.Right
                              ? "canvas-node-overlay-handle-right"
                              : ""
                        } ${handle.className}`}
                        style={{
                          top: handle.top || "50%",
                          left: handle.position === Position.Left ? 0 : undefined,
                          right: handle.position === Position.Right ? 0 : undefined,
                        }}
                      />
                      {handle.label && (
                        <div
                          className={`absolute text-[10px] text-base-content/50 ${
                            handle.labelClassName || "-left-9"
                          }`}
                          style={{
                            top: handle.top || "50%",
                            transform: "translateY(-100%)",
                          }}
                        >
                          {handle.label}
                        </div>
                      )}
                    </div>
                  ))}
                <div className="canvas-node-overlay-content">
                  <Renderer
                    id={node.id}
                    type={node.type || ""}
                    data={node.data as Record<string, unknown>}
                    selected={selected}
                    hovered={hovered}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
