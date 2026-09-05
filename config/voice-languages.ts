export type VoiceSupport = "supported" | "partial" | "unavailable";
export type VoiceLanguage = { id: string; name: string; nativeName: string; locale: string; speechInput: VoiceSupport; speechOutput: VoiceSupport };

export const voiceLanguages: VoiceLanguage[] = [
  { id: "English", name: "English", nativeName: "English", locale: "en-US", speechInput: "supported", speechOutput: "supported" },
  { id: "Luganda", name: "Luganda", nativeName: "Luganda", locale: "lg-UG", speechInput: "partial", speechOutput: "unavailable" },
  { id: "Kiswahili", name: "Swahili", nativeName: "Kiswahili", locale: "sw-KE", speechInput: "partial", speechOutput: "partial" },
  { id: "Runyankole", name: "Runyankole", nativeName: "Runyankole", locale: "nyn-UG", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Rukiga", name: "Rukiga", nativeName: "Rukiga", locale: "cgg-UG", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Luo", name: "Luo", nativeName: "Dholuo", locale: "luo-KE", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Acholi", name: "Acholi", nativeName: "Acholi", locale: "ach-UG", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Ateso", name: "Ateso", nativeName: "Ateso", locale: "teo-UG", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Runyoro", name: "Runyoro", nativeName: "Runyoro", locale: "nyo-UG", speechInput: "unavailable", speechOutput: "unavailable" },
  { id: "Rutoro", name: "Rutoro", nativeName: "Rutoro", locale: "ttj-UG", speechInput: "unavailable", speechOutput: "unavailable" },
];

export function voiceLanguageFor(id?: string) { return voiceLanguages.find((language) => language.id === id) || voiceLanguages[0]; }
