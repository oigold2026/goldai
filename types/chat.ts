export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
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
