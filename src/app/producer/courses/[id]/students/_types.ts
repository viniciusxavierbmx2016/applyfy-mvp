export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

export interface Student {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl: string | null;
  enrolledAt: string;
  expiresAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  isExpired: boolean;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  lastViewedAt: string | null;
  tags?: TagInfo[];
}

export interface PageData {
  students: Student[];
  page: number;
  totalPages: number;
  total: number;
}

export interface AccessResult {
  email: string;
  password: string | null;
  workspaceUrl: string;
  isMaster: boolean;
}
