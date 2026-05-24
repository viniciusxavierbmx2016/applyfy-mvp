// READ-ONLY: lista todas as relações de um user antes de qualquer delete.
// Usage: node scripts/diag-user-deps.mjs <email>
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/diag-user-deps.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, name: true, createdAt: true },
  });
  console.log("== User ==");
  console.log(user);
  if (!user) process.exit(0);

  const userId = user.id;

  const [
    subs,
    enrollments,
    workspaceCreds,
    workspacesOwned,
    sessions,
    collaborators,
    adminCollab,
    posts,
    comments,
    lessonComments,
    likes,
    lessonReactions,
    progress,
    notifications,
    certificates,
    reviews,
    quizAttempts,
    userTags,
    liveMessages,
    liveModerations,
    liveNotifications,
    pushSubs,
    pendingExecutions,
    impersonateTargets,
    impersonateAdmins,
    accessLogs,
    auditLogs,
    supportTickets,
    assignedTickets,
    ticketMessages,
    ownedCourses,
    coursesAsCustomer,
    transactionsAsCustomer,
  ] = await Promise.all([
    prisma.subscription.findMany({ where: { userId }, select: { id: true, status: true, currentPeriodEnd: true } }),
    prisma.enrollment.findMany({ where: { userId }, select: { id: true, courseId: true, status: true } }),
    prisma.workspaceCredential.findMany({ where: { userId }, select: { id: true, workspaceId: true } }),
    prisma.workspace.findMany({ where: { ownerId: userId }, select: { id: true, slug: true, name: true } }),
    prisma.session.findMany({ where: { userId }, select: { id: true, expiresAt: true } }),
    prisma.collaborator.findMany({ where: { userId }, select: { id: true, workspaceId: true, status: true } }),
    prisma.adminCollaborator.findUnique({ where: { userId }, select: { id: true, status: true } }).catch(() => null),
    prisma.post.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.lessonComment.count({ where: { userId } }),
    prisma.like.count({ where: { userId } }),
    prisma.lessonReaction.count({ where: { userId } }),
    prisma.lessonProgress.count({ where: { userId } }),
    prisma.notification.count({ where: { userId } }),
    prisma.certificate.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.userTag.count({ where: { userId } }),
    prisma.liveMessage.count({ where: { userId } }),
    prisma.liveModerator.count({ where: { userId } }),
    prisma.liveNotification.count({ where: { userId } }),
    prisma.pushSubscription.count({ where: { userId } }),
    prisma.pendingExecution.count({ where: { userId } }),
    prisma.impersonateToken.count({ where: { targetUserId: userId } }).catch(() => "n/a"),
    prisma.impersonateToken.count({ where: { adminUserId: userId } }).catch(() => "n/a"),
    prisma.accessLog.count({ where: { userId } }),
    prisma.auditLog.count({ where: { userId } }),
    prisma.supportTicket.count({ where: { producerId: userId } }).catch(() => "n/a"),
    prisma.supportTicket.count({ where: { assignedToId: userId } }).catch(() => "n/a"),
    prisma.ticketMessage.count({ where: { authorId: userId } }).catch(() => "n/a"),
    prisma.course.findMany({ where: { ownerId: userId }, select: { id: true, slug: true, title: true } }).catch(() => []),
    prisma.producerTransaction.count({ where: { userId } }).catch(() => 0),
    prisma.producerTransaction.count({ where: { customerEmail: email } }).catch(() => 0),
  ]);

  console.log("\n== Hard relations (block delete or cascade) ==");
  console.log("Subscription:", subs);
  console.log("Enrollment:", enrollments);
  console.log("WorkspaceCredential:", workspaceCreds);
  console.log("Workspace owned:", workspacesOwned);
  console.log("Sessions:", sessions);
  console.log("Collaborator rows:", collaborators);
  console.log("AdminCollaborator:", adminCollab);
  console.log("Owned Courses:", ownedCourses);

  console.log("\n== Soft relations (counts) ==");
  console.log({
    posts,
    comments,
    lessonComments,
    likes,
    lessonReactions,
    progress,
    notifications,
    certificates,
    reviews,
    quizAttempts,
    userTags,
    liveMessages,
    liveModerations,
    liveNotifications,
    pushSubs,
    pendingExecutions,
    impersonateTargets,
    impersonateAdmins,
    accessLogs,
    auditLogs,
    supportTickets,
    assignedTickets,
    ticketMessages,
    producerTransactionsAsBuyer: transactionsAsCustomer,
    producerTransactionsAsUserId: coursesAsCustomer,
  });
} finally {
  await prisma.$disconnect();
}
