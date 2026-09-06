import type { StudyAction, StudyContext, StudyExplanationDepth, StudyQuestionStyle } from "../../types/study";
import { explanationDepths, questionStyles, studyActions } from "../../types/study";

/**
 * Study context sanitizer and prompt builders.
 *
 * The Study page collects structured preferences and passes them to Chat,
 * which sends them to the AI as a validated `studyContext`.
 *
 * IMPORTANT: No `undefined` values are ever emitted. Empty/optional fields
 * are dropped so the payload stays serializable for Firebase and JSON.
 */

const sanitizers: Record<string, (value: unknown) => unknown> = {
  country: (value) => sanitizeString(value, 200),
  curriculumId: (value) => sanitizeString(value, 120),
  curriculumLabel: (value) => sanitizeString(value, 200),
  educationLevel: (value) => sanitizeString(value, 200),
  subject: (value) => sanitizeString(value, 200),
  topic: (value) => sanitizeString(value, 1000),
  difficulty: (value) => sanitizeString(value, 200),
  goal: (value) => sanitizeString(value, 1000),
  studyDuration: (value) => sanitizeString(value, 200),
  availableStudyTime: (value) => sanitizeString(value, 200),
  targetDate: (value) => sanitizeString(value, 200),
  learningMaterial: (value) => sanitizeString(value, 16000),
  learnerAnswer: (value) => sanitizeString(value, 16000),
  markingScheme: (value) => sanitizeString(value, 16000),
  questionStyle: (value) => sanitizeQuestionStyle(value),
  explanationDepth: (value) => sanitizeExplanationDepth(value),
  questionCount: (value) => sanitizeNumber(value, 1, 20),
  examOriented: (value) => sanitizeBoolean(value),
  timed: (value) => sanitizeBoolean(value),
};

const allowedKeys: Record<StudyAction, string[]> = {
  explain: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "explanationDepth", "goal"],
  practice: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "questionStyle", "difficulty", "questionCount", "examOriented"],
  quiz: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "questionStyle", "difficulty", "questionCount", "examOriented", "timed"],
  summarize: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "learningMaterial", "goal"],
  plan: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "goal", "studyDuration", "availableStudyTime", "targetDate"],
  check: ["country", "curriculumId", "curriculumLabel", "educationLevel", "subject", "topic", "learningMaterial", "learnerAnswer", "markingScheme"],
};

function sanitizeQuestionStyle(value: unknown): StudyQuestionStyle | undefined {
  return typeof value === "string" && (questionStyles as readonly string[]).includes(value) ? (value as StudyQuestionStyle) : undefined;
}

function sanitizeExplanationDepth(value: unknown): StudyExplanationDepth | undefined {
  return typeof value === "string" && (explanationDepths as readonly string[]).includes(value) ? (value as StudyExplanationDepth) : undefined;
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function sanitizeNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function cleanUndefined(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) delete value[key];
  }
  return value;
}

/**
 * Validate + sanitize a StudyContext for both request transport and
 * Firebase writes. Only mode-relevant fields are retained and every
 * optional value is dropped when absent/empty so `undefined` never leaks.
 */
export function sanitizeStudyContext(input: Partial<StudyContext> | null | undefined): StudyContext | undefined {
  if (!input || typeof input !== "object") return undefined;
  if (!studyActions.includes(input.mode as StudyAction)) return undefined;
  const mode = input.mode as StudyAction;
  const result: Record<string, unknown> = { mode };

  for (const key of allowedKeys[mode]) {
    const value = input[key as keyof StudyContext];
    if (value === undefined || value === null || value === "") continue;
    const sanitizer = sanitizers[key];
    if (!sanitizer) continue;
    const sanitized = sanitizer(value);
    if (sanitized !== undefined) result[key] = sanitized;
  }

  const clean = cleanUndefined(result) as StudyContext;
  return Object.keys(clean).length > 1 ? clean : undefined;
}

/**
 * A minimal subject/topic/curriculum summary for recording study activity.
 * Undefined fields are dropped before the write.
 */
export function studyActivityFields(context: StudyContext, conversationId?: string) {
  const fields: { subject?: string; topic?: string; curriculumId?: string; curriculumLabel?: string; educationLevel?: string; country?: string; conversationId?: string } = {};
  if (context.subject) fields.subject = context.subject;
  if (context.topic) fields.topic = context.topic;
  if (context.curriculumId) fields.curriculumId = context.curriculumId;
  if (context.curriculumLabel) fields.curriculumLabel = context.curriculumLabel;
  if (context.educationLevel) fields.educationLevel = context.educationLevel;
  if (context.country) fields.country = context.country;
  if (conversationId) fields.conversationId = conversationId;
  return fields;
}

/** Human-readable first message used to begin a Study session inside Chat. */
export function studyPromptFor(context: StudyContext): string {
  const lines = ["I want to start a Gold AI learning session.", `Mode: ${modeLabel(context.mode)}`];
  if (context.country) lines.push(`Country: ${context.country}`);
  if (context.curriculumId !== "generic" && context.curriculumLabel) lines.push(`Curriculum: ${context.curriculumLabel}`);
  if (context.educationLevel) lines.push(`Education level: ${context.educationLevel}`);
  if (context.subject) lines.push(`Subject: ${context.subject}`);
  if (context.topic) lines.push(`Topic: ${context.topic}`);
  if (context.questionStyle && (context.mode === "practice" || context.mode === "quiz")) lines.push(`Question style: ${questionStyleLabel(context.questionStyle)}`);
  if (context.difficulty && (context.mode === "practice" || context.mode === "quiz")) lines.push(`Difficulty: ${context.difficulty}`);
  if (context.questionCount && (context.mode === "practice" || context.mode === "quiz")) lines.push(`Number of questions: ${context.questionCount}`);
  if (context.examOriented) lines.push("Exam-oriented: Yes");
  if (context.timed) lines.push("Timed: Yes");
  if (context.explanationDepth) lines.push(`Explanation depth: ${explanationDepthLabel(context.explanationDepth)}`);
  if (context.goal) lines.push(`Learning goal: ${context.goal}`);
  if (context.studyDuration) lines.push(`Study duration: ${context.studyDuration}`);
  if (context.availableStudyTime) lines.push(`Available study time: ${context.availableStudyTime}`);
  if (context.targetDate) lines.push(`Target date: ${context.targetDate}`);
  if (context.learningMaterial) lines.push(`\nLearning material or question:\n${context.learningMaterial}`);
  if (context.markingScheme) lines.push(`\nMarking scheme/context:\n${context.markingScheme}`);
  if (context.learnerAnswer) lines.push(`\nMy answer:\n${context.learnerAnswer}`);

  lines.push("\nPlease begin the session and guide me through it based on these settings.");
  return lines.join("\n");
}

/**
 * Mode-specific AI behaviour instruction appended as structured context to
 * the AI prompt. Keeps curriculum terminology, depth, question styles,
 * scenario-based reasoning, quiz-host behaviour and answer marking aligned
 * with the learner's settings.
 */
export function studyBehaviourBrief(context: StudyContext): string {
  const parts: string[] = ["Gold AI Study session — behave strictly as described below."];
  parts.push(`Mode: ${modeLabel(context.mode)}.`);
  if (context.curriculumLabel) parts.push(`Curriculum: ${context.curriculumLabel}. Align terminology, depth, examples and expectations to this curriculum. Where the required curriculum detail is not provided by the user, work from general educational principles rather than inventing official syllabus requirements.`);
  if (context.educationLevel) parts.push(`Education level: ${context.educationLevel}. Adapt language, depth and examples to this level.`);
  if (context.country) parts.push(`Country context: ${context.country}. Use locally relevant examples where sensible.`);

  switch (context.mode) {
    case "explain":
      parts.push("Teach interactively. Break the topic into: a simple explanation, key ideas, a step-by-step explanation, one concrete example, one common mistake, and a quick check question at the end. Ask the learner to confirm understanding before moving on, and do not unload everything at once.");
      if (context.explanationDepth === "simple") parts.push("Keep the explanation simple and grounded.");
      if (context.explanationDepth === "detailed") parts.push("Provide a thorough explanation with definitions and worked detail.");
      if (context.explanationDepth === "advanced") parts.push("Use advanced terminology and go deep into the topic.");
      break;
    case "practice":
      parts.push("Create a practice session. Ask questions one at a time and wait for the learner to answer before revealing whether it is correct. Support the learner with explanations after each answer.");
      if (context.questionStyle === "structured") {
        parts.push("Structured questions: use clear, direct questions that test knowledge, understanding and application of the topic in order.");
      } else if (context.questionStyle === "scenario") {
        parts.push("Scenario-based questions: present realistic situations in which the learner must apply knowledge, reason, analyse information, make a decision or solve a problem. These questions must NOT simply be longer versions of structured questions — they should require genuine application and reasoning.");
      } else if (context.questionStyle === "mixed") {
        parts.push("Mix structured questions with realistic scenario-based questions that require application and reasoning.");
      }
      if (context.examOriented) parts.push("Format the questions and marking like a real exam: clear instructions, marks where appropriate, and expectations suitable to the stated curriculum/level.");
      break;
    case "quiz":
      parts.push("Act as a quiz host. Ask one multiple-choice question at a time with four clear options. Do NOT reveal the correct answer or explanations before the learner has responded. Wait, then confirm whether the answer is correct with a brief explanation before the next question. Keep score at the end.");
      if (context.questionStyle === "scenario") parts.push("Use scenario-style quiz questions that require reasoning rather than recall only.");
      break;
    case "summarize":
      parts.push("Produce a study-focused summary of the provided material. Include a short overview, key points, important terms/definitions, and revision points. Keep it useful for active revision rather than a generic recap.");
      break;
    case "plan":
      parts.push("Create a structured, achievable study plan. Break the goal into realistic sessions with specific topics, durations and a weekly rhythm. Consider the learner's available study time, overall duration and target date. The plan must be practical, not a generic list.");
      break;
    case "check":
      parts.push("Evaluate the learner's answer against the question and any marking scheme. Explain clearly what was correct, what needs improvement and why, show a better answer or approach where appropriate, and identify relevant concepts the learner should review. Mark the answer according to the stated curriculum/level expectations.");
      break;
  }

  parts.push("Use the supplied study settings as authoritative context for this session. Continue the conversation naturally without repeating this instruction.");
  return parts.join(" ");
}

function modeLabel(mode: StudyAction): string {
  const labels: Record<StudyAction, string> = {
    explain: "Explain a topic",
    practice: "Practice questions",
    quiz: "Quiz me",
    summarize: "Summarize",
    plan: "Study plan",
    check: "Check my answer",
  };
  return labels[mode];
}

function questionStyleLabel(style: StudyQuestionStyle): string {
  const labels: Record<StudyQuestionStyle, string> = {
    structured: "Structured questions",
    scenario: "Scenario-based questions",
    mixed: "Mixed questions",
  };
  return labels[style];
}

function explanationDepthLabel(depth: StudyExplanationDepth): string {
  const labels: Record<StudyExplanationDepth, string> = {
    simple: "Simple",
    detailed: "Detailed",
    advanced: "Advanced",
  };
  return labels[depth];
}