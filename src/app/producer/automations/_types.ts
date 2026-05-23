export interface AutomationItem {
  id: string;
  name: string;
  active: boolean;
  triggerType: string;
  triggerConfig: string;
  actionType: string;
  actionConfig: string;
  courseId: string | null;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface LessonOption {
  id: string;
  title: string;
  quiz: { id: string } | null;
}

export interface ModuleOption {
  id: string;
  title: string;
  daysToRelease: number;
  lessons: LessonOption[];
}

export interface CourseOption {
  id: string;
  title: string;
  modules: ModuleOption[];
}

export interface TagOption {
  id: string;
  name: string;
  color: string;
  studentCount: number;
}

export interface CanvasNode {
  id: string;
  type: "start" | "trigger" | "action";
  x: number;
  y: number;
}

export interface TemplateData {
  name: string;
  emoji: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  needsCourse: boolean;
}
