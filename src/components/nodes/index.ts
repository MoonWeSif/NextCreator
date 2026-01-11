export { PromptNode } from "./PromptNode";
export { ImageGeneratorProNode, ImageGeneratorFastNode } from "./ImageGeneratorNode";
export { DalleGeneratorNode } from "./DalleGeneratorNode";
export { FluxGeneratorNode } from "./FluxGeneratorNode";
export { ImageInputNode } from "./ImageInputNode";
export { VideoGeneratorNode } from "./VideoGeneratorNode";
export { PPTContentNode } from "./PPTContentNode";
export { PPTAssemblerNode } from "./PPTAssemblerNode";
export { LLMContentNode } from "./LLMContentNode";
export { FileUploadNode } from "./FileUploadNode";

import { PromptNode } from "./PromptNode";
import { ImageGeneratorProNode, ImageGeneratorFastNode } from "./ImageGeneratorNode";
import { DalleGeneratorNode } from "./DalleGeneratorNode";
import { FluxGeneratorNode } from "./FluxGeneratorNode";
import { ImageInputNode } from "./ImageInputNode";
import { VideoGeneratorNode } from "./VideoGeneratorNode";
import { PPTContentNode } from "./PPTContentNode";
import { PPTAssemblerNode } from "./PPTAssemblerNode";
import { LLMContentNode } from "./LLMContentNode";
import { FileUploadNode } from "./FileUploadNode";

// 节点类型映射
export const nodeTypes = {
  promptNode: PromptNode,
  imageGeneratorProNode: ImageGeneratorProNode,
  imageGeneratorFastNode: ImageGeneratorFastNode,
  dalleGeneratorNode: DalleGeneratorNode,
  fluxGeneratorNode: FluxGeneratorNode,
  imageInputNode: ImageInputNode,
  videoGeneratorNode: VideoGeneratorNode,
  pptContentNode: PPTContentNode,
  pptAssemblerNode: PPTAssemblerNode,
  llmContentNode: LLMContentNode,
  fileUploadNode: FileUploadNode,
};
