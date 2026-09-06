export type StudyLevel = { id: string; label: string; subjects: string[] };
export type Curriculum = { id: string; label: string; country: string; levels: StudyLevel[] };

/**
 * Curriculum awareness for Study.
 *
 * These structures use widely-recognised education system level names only.
 * Detailed official curriculum learning objectives are intentionally NOT
 * fabricated here; where precise data is unavailable the generic curriculum
 * is used as a sensible fallback.
 *
 * This data model is intentionally extensible so additional countries and
 * curriculum providers can be added later without changing the Study flow.
 */
export const curriculumData: Curriculum[] = [
  // Uganda — National Curriculum Development Centre (NCDC)
  {
    id: "ug-ncdc",
    label: "Uganda National Curriculum (NCDC)",
    country: "Uganda",
    levels: [
      { id: "pre", label: "Pre-Primary", subjects: ["Early Learning", "Language", "Numeracy"] },
      { id: "p1-3", label: "Lower Primary (P1–P3)", subjects: ["English", "Literacy", "Mathematics", "Science", "Local Language"] },
      { id: "p4-7", label: "Upper Primary (P4–P7)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Religious Education"] },
      { id: "s1-4", label: "Lower Secondary (S1–S4)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "ICT", "Entrepreneurship", "Kiswahili", "Local Language"] },
      { id: "s5-6", label: "Upper Secondary (S5–S6)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History", "Literature in English"] },
    ],
  },
  // Kenya — Competency Based Curriculum (CBC)
  {
    id: "ke-cbc",
    label: "Kenya Competency Based Curriculum (CBC)",
    country: "Kenya",
    levels: [
      { id: "pp", label: "Pre-Primary (PP1–PP2)", subjects: ["Language Activities", "Mathematical Activities", "Environmental Activities"] },
      { id: "g1-3", label: "Lower Primary (Grade 1–3)", subjects: ["English", "Kiswahili", "Mathematics", "Science and Technology", "Social Studies"] },
      { id: "g4-6", label: "Upper Primary (Grade 4–6)", subjects: ["English", "Kiswahili", "Mathematics", "Science and Technology", "Social Studies"] },
      { id: "g7-9", label: "Junior Secondary (Grade 7–9)", subjects: ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies"] },
      { id: "g10-12", label: "Senior Secondary (Grade 10–12)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "Business Studies"] },
    ],
  },
  // Tanzania
  {
    id: "tz-national",
    label: "Tanzania National Curriculum",
    country: "Tanzania",
    levels: [
      { id: "pre", label: "Pre-Primary", subjects: ["Early Learning"] },
      { id: "std1-7", label: "Primary (Standard 1–7)", subjects: ["English", "Kiswahili", "Mathematics", "Science", "Social Studies"] },
      { id: "form1-4", label: "O-Level Secondary (Form 1–4)", subjects: ["English", "Kiswahili", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "ICT"] },
      { id: "form5-6", label: "A-Level Secondary (Form 5–6)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History"] },
    ],
  },
  // Rwanda
  {
    id: "rw-national",
    label: "Rwanda National Curriculum",
    country: "Rwanda",
    levels: [
      { id: "nursery", label: "Nursery", subjects: ["Early Learning"] },
      { id: "p1-6", label: "Primary (P1–P6)", subjects: ["English", "Kinyarwanda", "French", "Mathematics", "Science", "Social Studies"] },
      { id: "s1-3", label: "Lower Secondary (S1–S3)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
      { id: "s4-6", label: "Upper Secondary (S4–S6)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History", "ICT"] },
    ],
  },
  // Nigeria
  {
    id: "ng-national",
    label: "Nigeria National Curriculum",
    country: "Nigeria",
    levels: [
      { id: "pre", label: "Pre-Primary", subjects: ["Early Learning"] },
      { id: "p1-6", label: "Primary (Primary 1–6)", subjects: ["English", "Mathematics", "Basic Science", "Social Studies", "Local Language"] },
      { id: "jss1-3", label: "Junior Secondary (JSS 1–3)", subjects: ["English", "Mathematics", "Basic Science", "Social Studies", "Civic Education", "ICT"] },
      { id: "sss1-3", label: "Senior Secondary (SSS 1–3)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "Government"] },
    ],
  },
  // Ghana
  {
    id: "gh-national",
    label: "Ghana National Curriculum",
    country: "Ghana",
    levels: [
      { id: "kg", label: "Kindergarten", subjects: ["Early Learning"] },
      { id: "basic1-6", label: "Primary (Basic 1–6)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "jhs1-3", label: "Junior High (JHS 1–3)", subjects: ["English", "Mathematics", "Integrated Science", "Social Studies", "ICT"] },
      { id: "shs1-3", label: "Senior High (SHS 1–3)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History"] },
    ],
  },
  // South Africa
  {
    id: "za-caps",
    label: "South Africa Curriculum (CAPS)",
    country: "South Africa",
    levels: [
      { id: "foundation", label: "Foundation Phase (Grade R–3)", subjects: ["Home Language", "First Additional Language", "Mathematics", "Life Skills"] },
      { id: "intermediate", label: "Intermediate Phase (Grade 4–6)", subjects: ["Home Language", "First Additional Language", "Mathematics", "Natural Science", "Social Sciences"] },
      { id: "senior", label: "Senior Phase (Grade 7–9)", subjects: ["Home Language", "First Additional Language", "Mathematics", "Natural Science", "Social Sciences", "Technology"] },
      { id: "fet", label: "FET (Grade 10–12)", subjects: ["Mathematics", "Mathematical Literacy", "Physical Science", "Biology", "Geography", "History", "Economics", "Accounting"] },
    ],
  },
  // Ethiopia
  {
    id: "et-national",
    label: "Ethiopia National Curriculum",
    country: "Ethiopia",
    levels: [
      { id: "p1-8", label: "Primary (Grade 1–8)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "s9-12", label: "Secondary (Grade 9–12)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Zambia
  {
    id: "zm-national",
    label: "Zambia National Curriculum",
    country: "Zambia",
    levels: [
      { id: "p1-7", label: "Primary (Grade 1–7)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "js8-9", label: "Junior Secondary (Grade 8–9)", subjects: ["English", "Mathematics", "Science", "Social Studies", "ICT"] },
      { id: "ss10-12", label: "Senior Secondary (Grade 10–12)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "Economics"] },
    ],
  },
  // Zimbabwe
  {
    id: "zw-national",
    label: "Zimbabwe National Curriculum",
    country: "Zimbabwe",
    levels: [
      { id: "p1-7", label: "Primary (Grade 1–7)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "olevel", label: "O-Level (Forms 1–4)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
      { id: "alevel", label: "A-Level (Forms 5–6)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics"] },
    ],
  },
  // Malawi
  {
    id: "mw-national",
    label: "Malawi National Curriculum",
    country: "Malawi",
    levels: [
      { id: "p1-8", label: "Primary (Standard 1–8)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "s1-4", label: "Secondary (Form 1–4)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Botswana
  {
    id: "bw-national",
    label: "Botswana National Curriculum",
    country: "Botswana",
    levels: [
      { id: "p1-7", label: "Primary (Standard 1–7)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Setswana"] },
      { id: "js8-9", label: "Junior Secondary (Form 1–2)", subjects: ["English", "Mathematics", "Science", "Social Studies"] },
      { id: "ss10-12", label: "Senior Secondary (Form 3–5)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "Economics"] },
    ],
  },
  // Namibia
  {
    id: "na-national",
    label: "Namibia National Curriculum",
    country: "Namibia",
    levels: [
      { id: "p1-7", label: "Primary (Grade 1–7)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "js8-10", label: "Junior Secondary (Grade 8–10)", subjects: ["English", "Mathematics", "Integrated Science", "Social Studies"] },
      { id: "ss11-12", label: "Senior Secondary (Grade 11–12)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Mozambique
  {
    id: "mz-national",
    label: "Mozambique National Curriculum",
    country: "Mozambique",
    levels: [
      { id: "primary", label: "Primary (Classes 1–7)", subjects: ["Portuguese", "Mathematics", "Science", "Social Studies"] },
      { id: "secondary", label: "Secondary (Classes 8–12)", subjects: ["Portuguese", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Burundi
  {
    id: "bi-national",
    label: "Burundi National Curriculum",
    country: "Burundi",
    levels: [
      { id: "primary", label: "Primary (Years 1–6)", subjects: ["Kirundi", "French", "English", "Mathematics", "Science", "Social Studies"] },
      { id: "secondary", label: "Secondary (Years 7–12)", subjects: ["French", "English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // South Sudan
  {
    id: "ss-national",
    label: "South Sudan National Curriculum",
    country: "South Sudan",
    levels: [
      { id: "p1-8", label: "Primary (P1–P8)", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
      { id: "s1-4", label: "Secondary (S1–S4)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Senegal
  {
    id: "sn-national",
    label: "Sénégal National Curriculum",
    country: "Senegal",
    levels: [
      { id: "elementaire", label: "Élémentaire", subjects: ["Français", "Mathématiques", "Science", "Études Sociales"] },
      { id: "moyen", label: "Moyen (6e–3e)", subjects: ["Français", "Mathématiques", "SVT", "Histoire-Géographie"] },
      { id: "secondaire", label: "Secondaire (2nde–Tle)", subjects: ["Français", "Mathématiques", "SVT", "Physique-Chimie", "Histoire-Géographie"] },
    ],
  },
  // Cameroon
  {
    id: "cm-national",
    label: "Cameroon National Curriculum",
    country: "Cameroon",
    levels: [
      { id: "primary", label: "Primary", subjects: ["English", "French", "Mathematics", "Science", "Social Studies"] },
      { id: "lower_secondary", label: "Lower Secondary (FS 1–4)", subjects: ["English", "French", "Mathematics", "Science", "History", "Geography"] },
      { id: "upper_secondary", label: "Upper Secondary (HS)", subjects: ["English", "French", "Mathematics", "Biology", "Chemistry", "Physics", "Economics"] },
    ],
  },
  // Sierra Leone
  {
    id: "sl-national",
    label: "Sierra Leone National Curriculum",
    country: "Sierra Leone",
    levels: [
      { id: "p1-6", label: "Primary (Class 1–6)", subjects: ["English", "Mathematics", "Science", "Social Studies"] },
      { id: "jss1-3", label: "Junior Secondary (JSS 1–3)", subjects: ["English", "Mathematics", "Integrated Science", "Social Studies"] },
      { id: "sss1-3", label: "Senior Secondary (SSS 1–3)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // Liberia
  {
    id: "lr-national",
    label: "Liberia National Curriculum",
    country: "Liberia",
    levels: [
      { id: "p1-6", label: "Primary (Grade 1–6)", subjects: ["English", "Mathematics", "Science", "Social Studies"] },
      { id: "jhs", label: "Junior High (Grade 7–9)", subjects: ["English", "Mathematics", "Integrated Science", "Social Studies"] },
      { id: "shs", label: "Senior High (Grade 10–12)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
    ],
  },
  // United Kingdom — Key Stages
  {
    id: "uk-national",
    label: "United Kingdom National Curriculum (Key Stages)",
    country: "United Kingdom",
    levels: [
      { id: "early", label: "Early Years", subjects: ["Early Learning"] },
      { id: "ks1", label: "Key Stage 1 (Years 1–2)", subjects: ["English", "Mathematics", "Science", "Computing", "History", "Geography"] },
      { id: "ks2", label: "Key Stage 2 (Years 3–6)", subjects: ["English", "Mathematics", "Science", "Computing", "History", "Geography"] },
      { id: "ks3", label: "Key Stage 3 (Years 7–9)", subjects: ["English", "Mathematics", "Science", "Geography", "History", "Computing"] },
      { id: "ks4", label: "Key Stage 4 / GCSE (Years 10–11)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History"] },
      { id: "ks5", label: "Key Stage 5 / A-Level (Years 12–13)", subjects: ["Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History", "English Literature"] },
    ],
  },
  // United States
  {
    id: "us-national",
    label: "United States (Common Core / State Standards)",
    country: "United States",
    levels: [
      { id: "elementary", label: "Elementary (K–5)", subjects: ["English Language Arts", "Mathematics", "Science", "Social Studies"] },
      { id: "middle", label: "Middle School (6–8)", subjects: ["English Language Arts", "Mathematics", "Science", "Social Studies"] },
      { id: "high", label: "High School (9–12)", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "U.S. History", "World History"] },
      { id: "higher", label: "Higher Education", subjects: ["Coursework", "Research", "Academic Writing"] },
    ],
  },
];

export const genericCurriculum: Curriculum = {
  id: "generic",
  label: "General Curriculum",
  country: "*",
  levels: [
    { id: "early", label: "Early Learning", subjects: ["Early Learning"] },
    { id: "primary", label: "Primary", subjects: ["English", "Mathematics", "Science", "Social Studies", "Local Language"] },
    { id: "lower_secondary", label: "Lower Secondary", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "History", "ICT"] },
    { id: "upper_secondary", label: "Upper Secondary", subjects: ["English", "Mathematics", "Biology", "Chemistry", "Physics", "Geography", "Economics", "History"] },
    { id: "tertiary", label: "University / Tertiary", subjects: ["Coursework", "Research", "Academic Writing"] },
  ],
};

export function curriculumsFor(country: string | undefined | null): Curriculum[] {
  if (!country || country === "Other") return [genericCurriculum];
  const matches = curriculumData.filter((curriculum) => curriculum.country === country);
  return matches.length > 0 ? matches : [genericCurriculum];
}

export function curriculumFor(curriculumId: string | undefined | null): Curriculum | undefined {
  if (!curriculumId) return undefined;
  return curriculumData.find((curriculum) => curriculum.id === curriculumId) || (curriculumId === genericCurriculum.id ? genericCurriculum : undefined);
}

export function levelsFor(curriculumId: string | undefined | null): StudyLevel[] {
  const curriculum = curriculumFor(curriculumId);
  return curriculum ? curriculum.levels : [];
}

export function subjectsFor(curriculumId: string | undefined | null, levelId: string | undefined | null): string[] {
  if (!curriculumId || !levelId) return [];
  const level = levelsFor(curriculumId).find((candidate) => candidate.id === levelId);
  return level ? level.subjects : [];
}