import { Position, type Node, type NodeProps } from "@xyflow/react";
import type { ComponentType, CSSProperties } from "react";

import { PromptNode } from "@/components/nodes/PromptNode";
import { ImageGeneratorNode } from "@/components/nodes/ImageGeneratorNode";
import { ImageInputNode } from "@/components/nodes/ImageInputNode";
import { VideoGeneratorNode } from "@/components/nodes/VideoGeneratorNode";
import { VeoGeneratorNode } from "@/components/nodes/VeoGeneratorNode";
import { KlingGeneratorNode } from "@/components/nodes/KlingGeneratorNode";
import { PPTContentNode } from "@/components/nodes/PPTContentNode";
import { PPTAssemblerNode } from "@/components/nodes/PPTAssemblerNode";
import { LLMContentNode } from "@/components/nodes/LLMContentNode";
import { FileUploadNode } from "@/components/nodes/FileUploadNode";

export interface OverlayNodeHandleSpec {
  id?: string;
  type: "source" | "target";
  position: Position;
  className: string;
  top?: CSSProperties["top"];
  label?: string;
  labelClassName?: string;
  title?: string;
  isConnectable?: boolean;
  showMarker?: boolean;
}

export interface OverlayNodeRenderProps {
  id: string;
  type: string;
  data: Record<string, unknown>;
  selected: boolean;
  hovered: boolean;
}

export interface OverlayNodeDescriptor {
  type: string;
  size: {
    width: number;
    height: number;
  };
  handles: OverlayNodeHandleSpec[];
  render: ComponentType<OverlayNodeRenderProps>;
  showHandleMarkers?: boolean;
}

type GenericNodeProps = NodeProps<Node<Record<string, unknown>>>;
type OverlayCompatibleNodeComponent = ComponentType<any>;

function createOverlayNodeProps(props: OverlayNodeRenderProps): GenericNodeProps {
  return {
    id: props.id,
    type: props.type,
    data: {
      ...props.data,
      __renderOverlay: true,
    },
    selected: props.selected || props.hovered,
    dragging: false,
    zIndex: 0,
    selectable: false,
    draggable: false,
    deletable: true,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
}

function nodeRenderer(Component: OverlayCompatibleNodeComponent): ComponentType<OverlayNodeRenderProps> {
  return function OverlayNodeRenderer(props) {
    return <Component {...createOverlayNodeProps(props)} />;
  };
}

const promptHandle: OverlayNodeHandleSpec = {
  id: "input-prompt",
  type: "target",
  position: Position.Left,
  top: "42%",
  className: "!w-3 !h-3 !bg-blue-500 !border-2 !border-white",
  label: "提示词",
  labelClassName: "-left-9",
};

const imageHandle: OverlayNodeHandleSpec = {
  id: "input-image",
  type: "target",
  position: Position.Left,
  top: "64%",
  className: "!w-3 !h-3 !bg-green-500 !border-2 !border-white",
  label: "参考图",
  labelClassName: "-left-9",
};

const imageGeneratorInputTop = 116;
const videoGeneratorInputTop = 116;
const llmContentInputTop = 116;

const imageGeneratorUnifiedInputHandle: OverlayNodeHandleSpec = {
  id: "input",
  type: "target",
  position: Position.Left,
  top: imageGeneratorInputTop,
  className: "canvas-node-minimal-handle canvas-node-minimal-handle-input",
  title: "输入",
};

const imageGeneratorLegacyPromptHandle: OverlayNodeHandleSpec = {
  id: "input-prompt",
  type: "target",
  position: Position.Left,
  top: imageGeneratorInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

const imageGeneratorLegacyImageHandle: OverlayNodeHandleSpec = {
  id: "input-image",
  type: "target",
  position: Position.Left,
  top: imageGeneratorInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

function sourceHandle(id: string, className: string, title?: string): OverlayNodeHandleSpec {
  return {
    id,
    type: "source",
    position: Position.Right,
    top: "50%",
    className: `!w-3 !h-3 ${className} !border-2 !border-white`,
    title,
  };
}

function imageGeneratorHandles(): OverlayNodeHandleSpec[] {
  return [
    imageGeneratorUnifiedInputHandle,
    imageGeneratorLegacyPromptHandle,
    imageGeneratorLegacyImageHandle,
    {
      id: "output-image",
      type: "source",
      position: Position.Right,
      top: imageGeneratorInputTop,
      className: "canvas-node-minimal-handle canvas-node-minimal-handle-output",
      title: "输出图片",
    },
  ];
}

function videoGeneratorHandles(outputClassName: string, imageLabel = "图片"): OverlayNodeHandleSpec[] {
  return [
    promptHandle,
    {
      ...imageHandle,
      label: imageLabel,
      labelClassName: imageLabel.length > 2 ? "-left-9" : "-left-6",
    },
    sourceHandle("output-video", outputClassName),
  ];
}

const videoGeneratorUnifiedInputHandle: OverlayNodeHandleSpec = {
  id: "input",
  type: "target",
  position: Position.Left,
  top: videoGeneratorInputTop,
  className: "canvas-node-minimal-handle canvas-node-minimal-handle-input",
  title: "输入",
};

const videoGeneratorLegacyPromptHandle: OverlayNodeHandleSpec = {
  id: "input-prompt",
  type: "target",
  position: Position.Left,
  top: videoGeneratorInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

const videoGeneratorLegacyImageHandle: OverlayNodeHandleSpec = {
  id: "input-image",
  type: "target",
  position: Position.Left,
  top: videoGeneratorInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

function unifiedVideoGeneratorHandles(): OverlayNodeHandleSpec[] {
  return [
    videoGeneratorUnifiedInputHandle,
    videoGeneratorLegacyPromptHandle,
    videoGeneratorLegacyImageHandle,
    {
      id: "output-video",
      type: "source",
      position: Position.Right,
      top: videoGeneratorInputTop,
      className: "canvas-node-minimal-handle canvas-node-minimal-handle-output",
      title: "输出视频",
    },
  ];
}

const llmContentUnifiedInputHandle: OverlayNodeHandleSpec = {
  id: "input",
  type: "target",
  position: Position.Left,
  top: llmContentInputTop,
  className: "canvas-node-minimal-handle canvas-node-minimal-handle-input",
  title: "输入",
};

const llmContentLegacyPromptHandle: OverlayNodeHandleSpec = {
  id: "input-prompt",
  type: "target",
  position: Position.Left,
  top: llmContentInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

const llmContentLegacyImageHandle: OverlayNodeHandleSpec = {
  id: "input-image",
  type: "target",
  position: Position.Left,
  top: llmContentInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

const llmContentLegacyFileHandle: OverlayNodeHandleSpec = {
  id: "input-file",
  type: "target",
  position: Position.Left,
  top: llmContentInputTop,
  className: "canvas-node-legacy-handle",
  isConnectable: false,
  showMarker: false,
};

function unifiedLLMContentHandles(): OverlayNodeHandleSpec[] {
  return [
    llmContentUnifiedInputHandle,
    llmContentLegacyPromptHandle,
    llmContentLegacyImageHandle,
    llmContentLegacyFileHandle,
    {
      id: "output-prompt",
      type: "source",
      position: Position.Right,
      top: llmContentInputTop,
      className: "canvas-node-minimal-handle canvas-node-minimal-handle-output",
      title: "输出内容",
    },
  ];
}

export const overlayNodeDescriptors: Record<string, OverlayNodeDescriptor> = {
  promptNode: {
    type: "promptNode",
    size: { width: 300, height: 155 },
    handles: [sourceHandle("output-prompt", "!bg-blue-500")],
    render: nodeRenderer(PromptNode),
  },
  imageInputNode: {
    type: "imageInputNode",
    size: { width: 200, height: 176 },
    handles: [sourceHandle("output-image", "!bg-green-500")],
    render: nodeRenderer(ImageInputNode),
  },
  fileUploadNode: {
    type: "fileUploadNode",
    size: { width: 220, height: 162 },
    handles: [sourceHandle("output-file", "!bg-orange-500")],
    render: nodeRenderer(FileUploadNode),
  },
  imageGeneratorNode: {
    type: "imageGeneratorNode",
    size: { width: 360, height: 430 },
    handles: imageGeneratorHandles(),
    render: nodeRenderer(ImageGeneratorNode),
  },
  videoGeneratorNode: {
    type: "videoGeneratorNode",
    size: { width: 360, height: 430 },
    handles: unifiedVideoGeneratorHandles(),
    render: nodeRenderer(VideoGeneratorNode),
  },
  veoGeneratorNode: {
    type: "veoGeneratorNode",
    size: { width: 220, height: 228 },
    handles: videoGeneratorHandles("!bg-purple-500"),
    render: nodeRenderer(VeoGeneratorNode),
  },
  klingGeneratorNode: {
    type: "klingGeneratorNode",
    size: { width: 220, height: 228 },
    handles: videoGeneratorHandles("!bg-cyan-500"),
    render: nodeRenderer(KlingGeneratorNode),
  },
  llmContentNode: {
    type: "llmContentNode",
    size: { width: 360, height: 430 },
    handles: unifiedLLMContentHandles(),
    render: nodeRenderer(LLMContentNode),
  },
  pptContentNode: {
    type: "pptContentNode",
    size: { width: 360, height: 430 },
    handles: [
      {
        ...promptHandle,
        top: "15%",
        label: "主题",
        labelClassName: "-left-6",
      },
      {
        ...imageHandle,
        top: "40%",
        label: "模板图",
      },
      {
        id: "input-file",
        type: "target",
        position: Position.Left,
        top: "65%",
        className: "!w-3 !h-3 !bg-orange-500 !border-2 !border-white",
        label: "参考文件",
        labelClassName: "-left-12",
      },
      sourceHandle("output-results", "!bg-indigo-500"),
    ],
    render: nodeRenderer(PPTContentNode),
  },
  pptAssemblerNode: {
    type: "pptAssemblerNode",
    size: { width: 280, height: 260 },
    handles: [
      {
        id: "input-results",
        type: "target",
        position: Position.Left,
        top: "50%",
        className: "!w-3 !h-3 !bg-purple-500 !border-2 !border-white",
        title: "PPT 页面数据",
      },
    ],
    render: nodeRenderer(PPTAssemblerNode),
  },
};

export const overlayNodeTypes = Object.keys(overlayNodeDescriptors);

export function getOverlayNodeDescriptor(type?: string | null) {
  return type ? overlayNodeDescriptors[type] : undefined;
}
