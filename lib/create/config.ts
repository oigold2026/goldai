import type { CreateType } from "../../types/create";

export const createTypeOptions: Array<{ value: CreateType; label: string; instruction: string }> = [
  { value: "writing", label: "Writing", instruction: "Create polished, clear writing." },
  { value: "notes", label: "Notes", instruction: "Organize the ideas into concise headings and bullets." },
  { value: "summary", label: "Summary", instruction: "Summarize the material clearly and preserve important details." },
  { value: "study_material", label: "Study materials", instruction: "Create useful revision material with key ideas and checks." },
  { value: "questions", label: "Questions", instruction: "Create thoughtful questions with a clear answer key." },
  { value: "quiz", label: "Quiz", instruction: "Create a structured quiz with options and explanations." },
  { value: "explanation", label: "Explanation", instruction: "Explain the topic simply, step by step, with an example." },
  { value: "essay", label: "Essay", instruction: "Write a well-structured essay with a clear argument." },
  { value: "report", label: "Report", instruction: "Create a structured report with headings and practical conclusions." },
  { value: "presentation", label: "Presentation outline", instruction: "Create a slide-by-slide presentation outline." },
  { value: "business", label: "Business content", instruction: "Create concise, practical business content." },
  { value: "social", label: "Content ideas", instruction: "Generate useful, audience-aware content ideas." },
  { value: "general", label: "General content", instruction: "Create useful content matching the user's request." },
];

export function getCreateType(type: string) { return createTypeOptions.find((item) => item.value === type); }
