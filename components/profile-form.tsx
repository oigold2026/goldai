"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { countries } from "../config/countries";
import { educationLevels, languages, researchTypes } from "../config/languages";
import { userGroupOptions } from "../config/user-groups";
import { getUserName } from "../lib/auth";
import { getProfileErrorMessage } from "../lib/profile";
import type { UserProfile } from "../types/user";
import { useAuth } from "./auth-provider";
import { useProfile } from "./profile-provider";
import { GoldAILogo, GoldAILogoLoader, ThemeToggle } from "./gold-ai-ui";
import { ArrowLeft } from "lucide-react";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter at least 2 characters.").max(80, "Please use a shorter name."),
  userGroup: z.enum(["student", "university_student", "teacher", "researcher", "general"], { message: "Choose how you will use Gold AI." }),
  country: z.string().min(1, "Choose your country."),
  preferredLanguage: z.string().min(1, "Choose your preferred language."),
  educationLevel: z.string().optional(),
  classOrYear: z.string().max(80, "Please use a shorter class or year.").optional(),
  institution: z.string().max(120, "Please use a shorter institution name.").optional(),
  programme: z.string().max(120, "Please use a shorter programme name.").optional(),
  subjects: z.string().max(240, "Please use fewer subjects.").optional(),
  interests: z.string().max(240, "Please use fewer interests.").optional(),
  researchType: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function asFormValues(profile: UserProfile | null, fallbackName: string): ProfileFormValues {
  return {
    name: profile?.name || fallbackName,
    userGroup: profile?.userGroup || "student",
    country: profile?.country || "",
    preferredLanguage: profile?.preferredLanguage || "English",
    educationLevel: profile?.educationLevel || "",
    classOrYear: profile?.classOrYear || "",
    institution: profile?.institution || "",
    programme: profile?.programme || "",
    subjects: profile?.subjects?.join(", ") || "",
    interests: profile?.interests || "",
    researchType: profile?.researchType || "",
  };
}

export function ProfileForm({ onboarding = false }: { onboarding?: boolean }) {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading, saveProfile, error: profileError } = useProfile();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const initialValues = asFormValues(profile, getUserName(user));
  const [selectedGroup, setSelectedGroup] = useState<ProfileFormValues["userGroup"]>(initialValues.userGroup);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: initialValues });

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  useEffect(() => { reset(asFormValues(profile, getUserName(user))); }, [profile, reset, user]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    setSubmitError(null);
    setSaved(false);
    try {
      await saveProfile({ ...values, email: user?.email || "", subjects: values.subjects ? values.subjects.split(",").map((subject) => subject.trim()).filter(Boolean) : [], onboardingCompleted: true });
      setSaved(true);
      if (onboarding) router.replace("/");
    } catch (error) { setSubmitError(error instanceof Error ? error.message : getProfileErrorMessage(error)); }
  };

  if (profileLoading && !profile) return <main className="auth-loading"><GoldAILogoLoader size="lg" label="Loading your profile..." /></main>;

  return (
    <main className="auth-page">
      <div className="auth-topbar">{!onboarding && <button className="icon-button" type="button" onClick={goBack} aria-label="Go back" title="Go back"><ArrowLeft size={19} /></button>}<GoldAILogo compact /><ThemeToggle /></div>
      <section className="profile-panel" aria-labelledby="profile-title">
        <span className="eyebrow">{onboarding ? "Welcome to Gold AI" : "Your Gold AI profile"}</span>
        <h1 id="profile-title">{onboarding ? "How will you use Gold AI?" : "Your profile"}</h1>
        <p className="auth-intro">{onboarding ? "Tell us just enough to make your experience feel like yours." : "Keep your learning context up to date. You can change it anytime."}</p>
        {(profileError || submitError) && <p className="form-error" role="alert">{profileError || submitError}</p>}
        {saved && <p className="form-success" role="status">Profile updated successfully.</p>}
        <form className="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label>Name<input autoComplete="name" {...register("name")} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label>
          <fieldset><legend>Choose what best describes you</legend><div className="group-grid">{userGroupOptions.map(({ value, label, description, icon: Icon }) => <label className={`group-option ${selectedGroup === value ? "selected" : ""}`} key={value}><input type="radio" value={value} {...register("userGroup", { onChange: (event) => setSelectedGroup(event.target.value as ProfileFormValues["userGroup"]) })} /><span className="group-option-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{description}</small></span></label>)}</div>{errors.userGroup && <small className="field-error">{errors.userGroup.message}</small>}</fieldset>
          <div className="form-grid"><label>Country<select {...register("country")}><option value="">Select country</option>{countries.map((country) => <option value={country} key={country}>{country}</option>)}</select>{errors.country && <small className="field-error">{errors.country.message}</small>}</label><label>Preferred language<select {...register("preferredLanguage")}><option value="">Select language</option>{languages.map((language) => <option value={language} key={language}>{language}</option>)}</select>{errors.preferredLanguage && <small className="field-error">{errors.preferredLanguage.message}</small>}</label></div>
          {selectedGroup === "student" && <div className="form-grid"><label>Education level<select {...register("educationLevel")}><option value="">Select level</option>{educationLevels.map((level) => <option value={level} key={level}>{level}</option>)}</select></label><label>Class / grade<input placeholder="e.g. S.3" {...register("classOrYear")} /></label></div>}
          {(selectedGroup === "university_student" || selectedGroup === "teacher") && <div className="form-grid"><label>Institution<input placeholder="Optional" {...register("institution")} /></label>{selectedGroup === "university_student" ? <label>Programme<input placeholder="e.g. Computer Science" {...register("programme")} /></label> : <label>Education level taught<select {...register("educationLevel")}><option value="">Optional</option>{educationLevels.map((level) => <option value={level} key={level}>{level}</option>)}</select></label>}</div>}
          {(selectedGroup === "university_student" || selectedGroup === "teacher" || selectedGroup === "student") && <label>{selectedGroup === "teacher" ? "Subjects / classes taught" : selectedGroup === "student" ? "Subjects" : "Courses"}<input placeholder="Separate with commas" {...register("subjects")} /></label>}
          {selectedGroup === "researcher" && <div className="form-grid"><label>Institution / organization<input placeholder="Optional" {...register("institution")} /></label><label>Research type<select {...register("researchType")}><option value="">Select type</option>{researchTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label><label className="full-field">Research interests<input placeholder="e.g. Agriculture, technology" {...register("interests")} /></label></div>}
          {selectedGroup === "general" && <label>Interests<input placeholder="Optional" {...register("interests")} /></label>}
          <div className="profile-actions"><button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <GoldAILogoLoader size="sm" label="Saving profile..." /> : onboarding ? "Continue" : "Save Profile"}</button>{onboarding ? <span className="skip-link">Your user group is required</span> : <Link className="skip-link" href="/">Cancel</Link>}</div>
        </form>
        {!onboarding && <button className="auth-secondary" type="button" onClick={() => void logout()}>Log out</button>}
      </section>
    </main>
  );
}
