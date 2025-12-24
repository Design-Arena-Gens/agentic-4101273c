export type SubjectDetails = {
  id: string;
  name: string;
  topics: string[];
};

export type StudentProfile = {
  grade: string;
  examDate: string;
  dailyHours: number;
  language: "en" | "hi";
  subjects: SubjectDetails[];
};

export type PlanSettings = {
  lightenFactor: number;
};

export type PlanTaskType = "study" | "revision";

export type PlanTask = {
  id: string;
  subject: string;
  title: string;
  type: PlanTaskType;
  estimatedHours: number;
  weekIndex: number;
};

export type PlanDay = {
  date: string;
  readableDate: string;
  focusMessage: string;
  tasks: PlanTask[];
};

export type PlanSummary = {
  totalTasks: number;
  totalDays: number;
  tasksPerDay: number;
  examCountdown: number;
};

export type GeneratedPlan = {
  days: PlanDay[];
  summary: PlanSummary;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toStartOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDate = (date: Date, locale: StudentProfile["language"]) => {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
};

const buildStudyTasks = (profile: StudentProfile) => {
  const tasks: PlanTask[] = [];
  profile.subjects.forEach((subject, subjectIndex) => {
    const baseTopics =
      subject.topics.length > 0
        ? subject.topics
        : [
            `${subject.name} quick notes`,
            `${subject.name} practice set`,
            `${subject.name} recap questions`,
          ];
    baseTopics.forEach((topic, topicIndex) => {
      const cleanTopic = topic.trim();
      if (!cleanTopic) {
        return;
      }
      tasks.push({
        id: `study-${subjectIndex}-${topicIndex}`,
        subject: subject.name,
        title: cleanTopic,
        type: "study",
        estimatedHours: 1,
        weekIndex: 0,
      });
    });
  });
  return tasks;
};

const ensureExamDate = (examDate: string) => {
  const today = toStartOfDay(new Date());
  const parsed = examDate ? toStartOfDay(new Date(examDate)) : today;
  if (Number.isNaN(parsed.getTime()) || parsed < today) {
    return today;
  }
  return parsed;
};

const allocateTasksToDays = (
  tasks: PlanTask[],
  profile: StudentProfile,
  settings: PlanSettings,
  locale: StudentProfile["language"],
) => {
  const start = toStartOfDay(new Date());
  const exam = ensureExamDate(profile.examDate);
  const totalDaysInitial =
    Math.max(1, Math.round((exam.getTime() - start.getTime()) / ONE_DAY_MS)) + 1;

  const days: PlanDay[] = [];
  const dailyCapacity = Math.max(1, Math.floor(profile.dailyHours * settings.lightenFactor));

  let taskPointer = 0;
  let extraDayIndex = 0;

  const pushDay = (date: Date) => {
    const focusSubject = tasks[taskPointer]?.subject ?? "";
    return {
      date: date.toISOString(),
      readableDate: formatDate(date, locale),
      focusMessage: focusSubject
        ? locale === "hi"
          ? `${focusSubject} पर ध्यान रखें और छोटे-छोटे ब्रेक लें।`
          : `Focus on ${focusSubject} and take short breaks.`
        : locale === "hi"
          ? "आज हल्का दोहराव करें और आत्मविश्वास रखें।"
          : "Use today for light revision and stay confident.",
      tasks: [] as PlanTask[],
    };
  };

  for (let i = 0; i < totalDaysInitial; i += 1) {
    const date = new Date(start.getTime() + i * ONE_DAY_MS);
    days.push(pushDay(date));
  }

  while (taskPointer < tasks.length) {
    if (extraDayIndex >= days.length) {
      const lastDate = new Date(days[days.length - 1].date);
      const nextDate = new Date(lastDate.getTime() + ONE_DAY_MS);
      days.push(pushDay(nextDate));
    }
    const day = days[extraDayIndex];
    let remaining = dailyCapacity;

    while (remaining >= 0.5 && taskPointer < tasks.length) {
      const task = tasks[taskPointer];
      const plannedTask: PlanTask = {
        ...task,
        id: `${task.id}-d${extraDayIndex}`,
        weekIndex: Math.floor(extraDayIndex / 7),
      };
      day.tasks.push(plannedTask);
      remaining -= plannedTask.estimatedHours;
      taskPointer += 1;
    }

    extraDayIndex += 1;
  }

  return days;
};

const injectWeeklyRevision = (days: PlanDay[], language: StudentProfile["language"]) => {
  const localeIsHindi = language === "hi";
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    const remainingSpace = Math.max(0, 3 - day.tasks.length);
    if (!remainingSpace) {
      continue;
    }
    const isRevisionDay =
      day.tasks.length > 0 &&
      ((dayIndex % 7 === 6 && day.tasks.some((t) => t.type === "study")) ||
        (dayIndex === days.length - 1 && day.tasks.some((t) => t.type === "study")));

    if (!isRevisionDay) {
      continue;
    }

    const startOfWeek = dayIndex - (dayIndex % 7);
    const coveredSubjects = new Set<string>();
    for (let i = startOfWeek; i <= dayIndex; i += 1) {
      days[i]?.tasks
        .filter((task) => task.type === "study")
        .forEach((task) => coveredSubjects.add(task.subject));
    }

    if (!coveredSubjects.size) {
      continue;
    }

    const revisionTask: PlanTask = {
      id: `revision-${dayIndex}`,
      subject: localeIsHindi ? "दोहराव" : "Revision",
      title: localeIsHindi
        ? `सप्ताह का पुनरावलोकन: ${Array.from(coveredSubjects).join(", ")}`
        : `Weekly recap: ${Array.from(coveredSubjects).join(", ")}`,
      type: "revision",
      estimatedHours: 1,
      weekIndex: Math.floor(dayIndex / 7),
    };

    day.tasks.push(revisionTask);
  }
};

const buildSummary = (days: PlanDay[]) => {
  const totalTasks = days.reduce((sum, day) => sum + day.tasks.length, 0);
  const totalDays = days.length;
  const tasksPerDay = totalDays ? Math.round(totalTasks / totalDays) : totalTasks;
  const today = toStartOfDay(new Date());
  const lastDay = days[days.length - 1];
  const examCountdown = lastDay
    ? Math.max(
        0,
        Math.round(
          (toStartOfDay(new Date(lastDay.date)).getTime() - today.getTime()) / ONE_DAY_MS,
        ),
      )
    : 0;

  return { totalTasks, totalDays, tasksPerDay, examCountdown };
};

export const generateStudyPlan = (profile: StudentProfile, settings: PlanSettings): GeneratedPlan => {
  const tasks = buildStudyTasks(profile);
  const days = allocateTasksToDays(tasks, profile, settings, profile.language);
  injectWeeklyRevision(days, profile.language);

  return {
    days,
    summary: buildSummary(days),
  };
};
