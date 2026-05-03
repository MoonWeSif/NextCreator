import { memo } from "react";
import { Handle, type NodeProps, type Node } from "@xyflow/react";

import { getOverlayNodeDescriptor } from "./overlayNodeRegistry";
import type { CustomNodeData } from "@/types";

type InteractionNode = Node<CustomNodeData>;

function InteractionNodeShellBase({ type }: NodeProps<InteractionNode>) {
  const descriptor = getOverlayNodeDescriptor(type);

  if (!descriptor) {
    return null;
  }

  return (
    <div
      className="canvas-node-interaction-shell relative"
      style={{
        width: descriptor.size.width,
        height: descriptor.size.height,
      }}
    >
      {descriptor.handles.map((handle) => (
        <Handle
          key={`${handle.type}-${handle.id}`}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          className={handle.className}
          style={{ top: handle.top }}
          title={handle.title}
          isConnectable={handle.isConnectable}
        />
      ))}
    </div>
  );
}

export const InteractionNodeShell = memo(InteractionNodeShellBase);
InteractionNodeShell.displayName = "InteractionNodeShell";
