export interface LiveItem {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  externalUrl: string;
  embedUrl: string | null;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  thumbnailUrl: string | null;
  courseId: string | null;
  savedAsLessonId: string | null;
  visibility: string;
  course: { id: string; title: string } | null;
  _count: { messages: number };
  createdAt: string;
}

export interface CourseOption {
  id: string;
  title: string;
}

export interface ModuleOption {
  id: string;
  title: string;
}

export type StatusFilter = "ALL" | "SCHEDULED" | "LIVE" | "ENDED";
