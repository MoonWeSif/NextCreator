export { PromptNode } from "./PromptNode";
export { ImageGeneratorProNode, ImageGeneratorFastNode } from "./ImageGeneratorNode";
export { DalleGeneratorNode } from "./DalleGeneratorNode";
export { FluxGeneratorNode } from "./FluxGeneratorNode";
export { GptImageGeneratorNode } from "./GptImageGeneratorNode";
export { DoubaoGeneratorNode } from "./DoubaoGeneratorNode";
export { ZImageGeneratorNode } from "./ZImageGeneratorNode";
export { ImageInputNode } from "./ImageInputNode";
export { VideoGeneratorNode } from "./VideoGeneratorNode";
export { VeoGeneratorNode } from "./VeoGeneratorNode";
export { KlingGeneratorNode } from "./KlingGeneratorNode";
export { PPTContentNode } from "./PPTContentNode";
export { PPTAssemblerNode } from "./PPTAssemblerNode";
export { LLMContentNode } from "./LLMContentNode";
export { FileUploadNode } from "./FileUploadNode";

import { PromptNode } from "./PromptNode";
import { ImageGeneratorProNode, ImageGeneratorFastNode } from "./ImageGeneratorNode";
import { DalleGeneratorNode } from "./DalleGeneratorNode";
import { FluxGeneratorNode } from "./FluxGeneratorNode";
import { GptImageGeneratorNode } from "./GptImageGeneratorNode";
import { DoubaoGeneratorNode } from "./DoubaoGeneratorNode";
import { ZImageGeneratorNode } from "./ZImageGeneratorNode";
import { ImageInputNode } from "./ImageInputNode";
import { VideoGeneratorNode } from "./VideoGeneratorNode";
import { VeoGeneratorNode } from "./VeoGeneratorNode";
import { KlingGeneratorNode } from "./KlingGeneratorNode";
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
  gptImageGeneratorNode: GptImageGeneratorNode,
  doubaoGeneratorNode: DoubaoGeneratorNode,
  zImageGeneratorNode: ZImageGeneratorNode,
  imageInputNode: ImageInputNode,
  videoGeneratorNode: VideoGeneratorNode,
  veoGeneratorNode: VeoGeneratorNode,
  klingGeneratorNode: KlingGeneratorNode,
  pptContentNode: PPTContentNode,
  pptAssemblerNode: PPTAssemblerNode,
  llmContentNode: LLMContentNode,
  fileUploadNode: FileUploadNode,
};

