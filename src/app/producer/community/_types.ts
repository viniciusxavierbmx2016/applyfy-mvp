export interface AdminPost {
  id: string;
  content: string;
  type: "QUESTION" | "RESULT" | "FEEDBACK" | "FREE";
  pinned: boolean;
  status?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "STUDENT" | "ADMIN";
  };
  course: { id: string; title: string; slug: string };
  group?: { id: string; name: string } | null;
  _count: { likes: number; comments: number };
}

export interface PendingItem {
  id: string;
  type: "community_post" | "community_comment" | "lesson_comment";
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  course: { id: string; title: string; slug: string };
  group?: { id: string; name: string } | null;
  post?: { id: string; content: string } | null;
}

export interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  permission: "READ_WRITE" | "READ_ONLY";
  order: number;
  _count: { posts: number };
}
