'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  GeneratedPlan,
  PlanDay,
  PlanTask,
  PlanSettings,
  StudentProfile,
  SubjectDetails,
  generateStudyPlan,
} from "@/lib/planner";

type LanguageOption = "en" | "hi";

type SubjectFormState = {
  id: string;
  name: string;
  topicsText: string;
};

type StoredData = {
  profile: StudentProfile;
  planMode: PlanMode;
  completed: string[];
};

type PlanMode = "normal" | "gentle";

const STORAGE_KEY = "calm-study-buddy";

const DEFAULT_SUBJECTS: SubjectFormState[] = [
  {
    id: "subject-1",
    name: "",
    topicsText: "",
  },
];

const TEXT_COPY = {
  en: {
    appTitle: "Calm Study Buddy",
    subtitle: "A gentle planner to help you feel ready for exams.",
    formTitle: "Tell me about your exam",
    gradeLabel: "Class / Grade",
    gradePlaceholder: "Example: Grade 10",
    examDateLabel: "Exam Date",
    dailyHoursLabel: "Daily study hours",
    languageLabel: "Preferred language",
    subjectsLabel: "Subjects and small tasks",
    subjectNamePlaceholder: "Subject name",
    topicsPlaceholder: "Enter tiny tasks, one per line (ex: Chapter 3 summary)",
    addSubject: "Add another subject",
    createPlan: "Create my calm plan",
    planTitle: "Your steady plan",
    noPlanYet: "Fill the details above to see your plan.",
    lighten: "This feels heavy",
    normal: "Restore full plan",
    progressLabel: "Progress",
    resetProgress: "Reset tracking",
    gentleModeNote: "Plan lightened. Tasks are spaced out so you can breathe easier.",
    normalModeNote: "Full pace restored. Stay steady and take breaks.",
    motivationTitle: "Little boost",
    explanationTitle: "Need a tiny explanation?",
    explanationPlaceholder: "Ask in simple words. Example: Why is photosynthesis important?",
    explainButton: "Explain quickly",
    emptyAnswer: "Ask anything and I'll keep it short.",
    completedMessage: "Nice! You finished",
    outOf: "out of",
    tasks: "tasks.",
    todaysFocus: "Today's focus",
    lightenHint: "If it feels like too much, tap the button to slow things down.",
    overloadDetected: "Looks intense. Daily tasks were trimmed to stay within your hours.",
    weeklyRevision: "Weekly revision added automatically.",
    motivationPhrases: [
      "You're moving forward. Keep the rhythm gentle and steady.",
      "Small wins add up. Celebrate each finished task.",
      "Deep breath. One topic at a time does the magic.",
      "You're doing better than you think. Trust your effort.",
    ],
    answerPrefix: "Try this:",
    answerTip: "break it into keywords, write a short summary, and test yourself once.",
  },
  hi: {
    appTitle: "Calm Study Buddy",
    subtitle: "परिक्षा की तैयारी को हल्का और संतुलित बनाएं।",
    formTitle: "अपनी परीक्षा का विवरण बताएं",
    gradeLabel: "कक्षा / ग्रेड",
    gradePlaceholder: "उदाहरण: कक्षा 10",
    examDateLabel: "परीक्षा की तारीख",
    dailyHoursLabel: "रोज़ पढ़ाई के घंटे",
    languageLabel: "भाषा",
    subjectsLabel: "विषय और छोटे कार्य",
    subjectNamePlaceholder: "विषय का नाम",
    topicsPlaceholder: "छोटे कार्य एक-एक पंक्ति में लिखें (जैसे: अध्याय 3 का सार)",
    addSubject: "एक और विषय जोड़ें",
    createPlan: "मेरा शांत प्लान बनाएं",
    planTitle: "आपकी स्थिर योजना",
    noPlanYet: "ऊपर जानकारी भरें और योजना देखें।",
    lighten: "यह थोड़ा भारी लग रहा है",
    normal: "सामान्य गति पर लौटें",
    progressLabel: "प्रगति",
    resetProgress: "प्रगति रीसेट करें",
    gentleModeNote: "योजना हल्की कर दी गई है। कार्यों को आराम से फैलाया गया है।",
    normalModeNote: "फिर से सामान्य गति पर। ध्यान से पढ़ें और छोटे ब्रेक लें।",
    motivationTitle: "छोटी प्रेरणा",
    explanationTitle: "छोटी व्याख्या चाहिए?",
    explanationPlaceholder: "सरल शब्दों में पूछें। उदाहरण: प्रकाश संश्लेषण क्यों ज़रूरी है?",
    explainButton: "जल्दी समझाएं",
    emptyAnswer: "कुछ भी पूछें, मैं छोटा जवाब दूंगा।",
    completedMessage: "शानदार! आपने",
    outOf: "में से",
    tasks: "कार्य पूरे किए।",
    todaysFocus: "आज का फोकस",
    lightenHint: "यदि बोझिल लगे तो योजना हल्की करने का विकल्प दबाएं।",
    overloadDetected: "थोड़ा सघन था। कार्यों को आपकी समय सीमा में ढाल दिया गया है।",
    weeklyRevision: "साप्ताहिक पुनरावलोकन अपने आप जुड़ता रहेगा।",
    motivationPhrases: [
      "आप आगे बढ़ रहे हैं। लय को शांत और लगातार रखें।",
      "छोटी जीतें जुड़कर बड़ी सफलता बनती हैं।",
      "गहरी सांस लें। एक विषय पर ध्यान, और काम पूरा।",
      "आप सोच से बेहतर कर रहे हैं। अपने प्रयास पर भरोसा रखें।",
    ],
    answerPrefix: "ऐसा करें:",
    answerTip: "इसे मुख्य शब्दों में बाँटें, एक छोटा सार लिखें, और खुद से एक प्रश्न पूछें।",
  },
} as const;

const buildSubjectPayload = (data: SubjectFormState[]): SubjectDetails[] =>
  data
    .filter((subject) => subject.name.trim())
    .map<SubjectDetails>((subject) => ({
      id: subject.id,
      name: subject.name.trim(),
      topics: subject.topicsText
        .split(/\r?\n|,/)
        .map((line) => line.trim())
        .filter(Boolean),
    }));

const randomId = () => crypto.randomUUID();

const chooseMotivation = (language: LanguageOption) => {
  const items = TEXT_COPY[language].motivationPhrases;
  return items[Math.floor(Math.random() * items.length)];
};

export default function Home() {
  const [formSubjects, setFormSubjects] = useState<SubjectFormState[]>(DEFAULT_SUBJECTS);
  const [grade, setGrade] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(3);
  const [language, setLanguage] = useState<LanguageOption>("en");
  const [planMode, setPlanMode] = useState<PlanMode>("normal");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<StudentProfile | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [motivation, setMotivation] = useState(() => chooseMotivation(language));

  const text = TEXT_COPY[language];

  const planSettings = useMemo<PlanSettings>(
    () => ({
      lightenFactor: planMode === "gentle" ? 0.75 : 1,
    }),
    [planMode],
  );

  useEffect(() => {
    setMotivation(chooseMotivation(language));
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredData;
      if (parsed.profile) {
        setGrade(parsed.profile.grade);
        setExamDate(parsed.profile.examDate);
        setDailyHours(parsed.profile.dailyHours);
        setLanguage(parsed.profile.language);
        setFormSubjects(
          parsed.profile.subjects.length
            ? parsed.profile.subjects.map((subject) => ({
                id: subject.id || randomId(),
                name: subject.name,
                topicsText: subject.topics.join("\n"),
              }))
            : DEFAULT_SUBJECTS,
        );
        const storedMode: PlanMode = parsed.planMode ?? "normal";
        setPlanMode(storedMode);
        const regenerated = generateStudyPlan(parsed.profile, {
          lightenFactor: storedMode === "gentle" ? 0.75 : 1,
        });
        setProfileSnapshot(parsed.profile);
        setPlan(regenerated);
      }
      if (parsed.completed) {
        setCompletedTasks(new Set(parsed.completed));
      }
    } catch (error) {
      console.error("Unable to restore data", error);
    }
  }, []);

  useEffect(() => {
    if (!profileSnapshot) {
      return;
    }
    const payload: StoredData = {
      profile: profileSnapshot,
      planMode,
      completed: Array.from(completedTasks),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [completedTasks, planMode, profileSnapshot]);

  useEffect(() => {
    if (!profileSnapshot) {
      return;
    }
    const updatedPlan = generateStudyPlan(profileSnapshot, planSettings);
    setPlan(updatedPlan);
  }, [planSettings, profileSnapshot]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjects = buildSubjectPayload(formSubjects);
    const trimmedDailyHours = dailyHours > 0 ? dailyHours : 1;
    const profile: StudentProfile = {
      grade: grade.trim(),
      examDate,
      dailyHours: trimmedDailyHours,
      language,
      subjects,
    };
    const newPlan = generateStudyPlan(profile, planSettings);
    setPlan(newPlan);
    setProfileSnapshot(profile);
    setCompletedTasks(new Set());
    setMotivation(chooseMotivation(language));
  };

  const addSubjectRow = () => {
    setFormSubjects((prev) => [
      ...prev,
      {
        id: randomId(),
        name: "",
        topicsText: "",
      },
    ]);
  };

  const updateSubject = (id: string, field: "name" | "topicsText", value: string) => {
    setFormSubjects((prev) =>
      prev.map((subject) => (subject.id === id ? { ...subject, [field]: value } : subject)),
    );
  };

  const removeSubject = (id: string) => {
    setFormSubjects((prev) => (prev.length <= 1 ? prev : prev.filter((subject) => subject.id !== id)));
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const resetProgress = () => {
    setCompletedTasks(new Set());
  };

  const handleExplain = () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setAnswer(text.emptyAnswer);
      return;
    }
    const keywords = trimmed
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 4)
      .map((word) => word.replace(/[^a-zA-Z\u0900-\u097F]/g, ""));
    const keywordText = keywords.join(", ");
    const snippet =
      language === "hi"
        ? `${text.answerPrefix} ${keywordText || trimmed} को सरल शब्दों में लिखें और ${text.answerTip}`
        : `${text.answerPrefix} ${keywordText || trimmed} in simple words, then ${text.answerTip}`;
    setAnswer(snippet);
  };

  const planSummary = plan?.summary;
  const totalTasks = planSummary?.totalTasks ?? 0;
  const completedCount = completedTasks.size;

  const overload =
    planSummary && profileSnapshot
      ? planSummary.tasksPerDay > Math.ceil(profileSnapshot.dailyHours)
      : false;

  const todaysTasks: PlanDay | undefined = plan?.days.find((day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() === today.getTime();
  });

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1 className={styles.title}>{text.appTitle}</h1>
          <p className={styles.subtitle}>{text.subtitle}</p>
        </div>
        {planSummary && (
          <div className={styles.countdown}>
            <span>{planSummary.examCountdown}</span>
            <p>{language === "hi" ? "दिन बचे" : "days to go"}</p>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>{text.formTitle}</h2>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>{text.gradeLabel}</span>
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder={text.gradePlaceholder}
              required
            />
          </label>
          <label className={styles.formField}>
            <span>{text.examDateLabel}</span>
            <input
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              required
            />
          </label>
          <label className={styles.formField}>
            <span>{text.dailyHoursLabel}</span>
            <input
              type="number"
              min={1}
              max={12}
              step={0.5}
              value={dailyHours}
              onChange={(event) => setDailyHours(Number(event.target.value))}
              required
            />
          </label>
          <label className={styles.formField}>
            <span>{text.languageLabel}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageOption)}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
        </div>

        <div className={styles.subjectBlock}>
          <div className={styles.subjectHeader}>
            <span>{text.subjectsLabel}</span>
            <button type="button" onClick={addSubjectRow}>
              {text.addSubject}
            </button>
          </div>

          <div className={styles.subjectList}>
            {formSubjects.map((subject, index) => (
              <div key={subject.id} className={styles.subjectRow}>
                <div className={styles.subjectRowHeader}>
                  <span>{language === "hi" ? `विषय ${index + 1}` : `Subject ${index + 1}`}</span>
                  {formSubjects.length > 1 && (
                    <button type="button" onClick={() => removeSubject(subject.id)}>
                      {language === "hi" ? "हटाएं" : "Remove"}
                    </button>
                  )}
                </div>
                <input
                  value={subject.name}
                  onChange={(event) => updateSubject(subject.id, "name", event.target.value)}
                  placeholder={text.subjectNamePlaceholder}
                  required={formSubjects.length === 1}
                />
                <textarea
                  value={subject.topicsText}
                  onChange={(event) => updateSubject(subject.id, "topicsText", event.target.value)}
                  placeholder={text.topicsPlaceholder}
                  rows={4}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="submit">{text.createPlan}</button>
          {plan && (
            <button
              type="button"
              onClick={() => setPlanMode((prev) => (prev === "normal" ? "gentle" : "normal"))}
            >
              {planMode === "normal" ? text.lighten : text.normal}
            </button>
          )}
        </div>
        {plan && (
          <p className={styles.modeNote}>
            {planMode === "gentle" ? text.gentleModeNote : text.normalModeNote}
          </p>
        )}
        <p className={styles.hint}>{text.lightenHint}</p>
      </form>

      <section className={styles.planSection}>
        <h2>{text.planTitle}</h2>
        {!plan && <p className={styles.emptyState}>{text.noPlanYet}</p>}

        {plan && (
          <>
            <div className={styles.summary}>
              <div>
                <strong>{text.progressLabel}</strong>
                <p>
                  {language === "hi" ? `${completedCount} ${text.outOf} ${totalTasks} ${text.tasks}` : `${text.completedMessage} ${completedCount} ${text.outOf} ${totalTasks} ${text.tasks}`}
                </p>
                <progress value={completedCount} max={totalTasks || 1} />
              </div>
              <button type="button" onClick={resetProgress}>
                {text.resetProgress}
              </button>
            </div>
            {overload && <p className={styles.overload}>{text.overloadDetected}</p>}
            <p className={styles.overload}>{text.weeklyRevision}</p>

            {todaysTasks && (
              <div className={styles.todayCard}>
                <h3>{text.todaysFocus}</h3>
                <p>{todaysTasks.focusMessage}</p>
                <ul>
                  {todaysTasks.tasks.map((task) => (
                    <li key={task.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={completedTasks.has(task.id)}
                          onChange={() => toggleTask(task.id)}
                        />
                        <span>
                          {task.subject}: {task.title}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.dayGrid}>
              {plan.days.map((day) => (
                <article key={day.date} className={styles.dayCard}>
                  <header>
                    <span>{day.readableDate}</span>
                    <p>{day.focusMessage}</p>
                  </header>
                  <ul>
                    {day.tasks.map((task: PlanTask) => (
                      <li key={task.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={completedTasks.has(task.id)}
                            onChange={() => toggleTask(task.id)}
                          />
                          <span>
                            <strong>{task.subject}</strong> — {task.title}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={styles.sideBySide}>
        <div className={styles.motivationCard}>
          <h3>{text.motivationTitle}</h3>
          <p>{motivation}</p>
        </div>
        <div className={styles.explainCard}>
          <h3>{text.explanationTitle}</h3>
          <div className={styles.explainControls}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={text.explanationPlaceholder}
              rows={3}
            />
            <button type="button" onClick={handleExplain}>
              {text.explainButton}
            </button>
          </div>
          <p className={styles.answer}>{answer}</p>
        </div>
      </section>
    </div>
  );
}
