export const studyActions = ["explain", "practice", "quiz", "summarize", "plan", "check"] as const;
export type StudyAction = (typeof studyActions)[number];

export const questionStyles = ["structured", "scenario", "mixed"] as const;
export type StudyQuestionStyle = (typeof questionStyles)[number];

export const explanationDepths = ["simple", "detailed", "advanced"] as const;
export type StudyExplanationDepth = (typeof explanationDepths)[number];

export type StudyActivity = {
  id: string;
  userId: string;
  action: StudyAction;
  subject?: string;
  topic?: string;
  score?: number;
  total?: number;
  curriculumId?: string;
  curriculumLabel?: string;
  educationLevel?: string;
  country?: string;
  conversationId?: string;
  status?: "active" | "completed";
  createdAt: number;
};

/**
 * Structured Study context passed into Chat / the AI.
 *
 * Only fields relevant to the selected mode are populated.
 * Undefined values are removed before any Firebase write.
 */
export type StudyContext = {
  mode: StudyAction;
  country?: string;
  curriculumId?: string;
  curriculumLabel?: string;
  educationLevel?: string;
  subject?: string;
  topic?: string;
  questionStyle?: StudyQuestionStyle;
  difficulty?: string;
  questionCount?: number;
  explanationDepth?: StudyExplanationDepth;
  includeExamples?: boolean;
  summaryStyle?: string;
  preferredSchedule?: string;
  goal?: string;
  studyDuration?: string;
  availableStudyTime?: string;
  targetDate?: string;
  learningMaterial?: string;
  learnerAnswer?: string;
  markingScheme?: string;
  examOriented?: boolean;
  timed?: boolean;
};

export type StudyPlanStatus = "active" | "completed";

/**
 * A Study Plan is a time-boxed learning period.
 *
 * `startDate`/`endDate` are canonical epoch-millisecond timestamps and are
 * the source of truth for time progress. The percentage shown in the UI is
 * always calculated from these dates — never stored.
 */
export type StudyPlan = {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  topic?: string;
  goal?: string;
  durationDays: number;
  startDate: number;
  endDate: number;
  status: StudyPlanStatus;
  conversationId?: string;
  educationLevel?: string;
  country?: string;
  curriculumId?: string;
  curriculumLabel?: string;
  createdAt: number;
  updatedAt: number;
};

export type StudyQuestion = {
  prompt: string;
  type: "multiple_choice" | "short_answer" | "true_false" | "structured" | "open_ended";
  options?: string[];
  answer?: string;
  explanation?: string;
};