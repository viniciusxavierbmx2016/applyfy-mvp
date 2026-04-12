export type {
  User,
  Course,
  Module,
  Lesson,
  Enrollment,
  LessonProgress,
  Post,
  Comment,
  Like,
  LessonComment,
  Session,
} from "@prisma/client";

export { Role, EnrollmentStatus, PostType } from "@prisma/client";

import type { Course, Module, Lesson, Enrollment, LessonProgress, Post, Comment, Like, User } from "@prisma/client";

export type CourseWithModules = Course & {
  modules: (Module & {
    lessons: Lesson[];
  })[];
};

export type CourseWithProgress = Course & {
  modules: (Module & {
    lessons: (Lesson & {
      progress: LessonProgress[];
    })[];
  })[];
  enrollments: Enrollment[];
};

export type PostWithAuthor = Post & {
  user: Pick<User, "id" | "name" | "avatarUrl">;
  comments: (Comment & {
    user: Pick<User, "id" | "name" | "avatarUrl">;
  })[];
  likes: Like[];
  _count: { likes: number; comments: number };
};
