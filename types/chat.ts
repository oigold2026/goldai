export type MessageRole = "user" | "assistant";
import type { MessageAttachment } from "./multimodal";
import type { ResearchSource, WebImage } from "./research";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
  sources?: ResearchSource[];
  images?: WebImage[];
  createdAt: number;
  provider?: "openai" | "gemini";
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};
