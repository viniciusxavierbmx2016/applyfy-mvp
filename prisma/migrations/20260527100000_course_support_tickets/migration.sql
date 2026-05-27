-- CreateEnum
CREATE TYPE "CourseSupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "supportButtonColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "supportButtonImage" TEXT;

-- CreateTable
CREATE TABLE "CourseSupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "CourseSupportStatus" NOT NULL DEFAULT 'OPEN',
    "courseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadByStudentAt" TIMESTAMP(3),
    "lastReadByProducerAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSupportMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseSupportTicket_courseId_status_idx" ON "CourseSupportTicket"("courseId", "status");
CREATE INDEX "CourseSupportTicket_workspaceId_status_idx" ON "CourseSupportTicket"("workspaceId", "status");
CREATE INDEX "CourseSupportTicket_studentId_idx" ON "CourseSupportTicket"("studentId");
CREATE INDEX "CourseSupportMessage_ticketId_createdAt_idx" ON "CourseSupportMessage"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "CourseSupportTicket" ADD CONSTRAINT "CourseSupportTicket_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSupportTicket" ADD CONSTRAINT "CourseSupportTicket_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSupportTicket" ADD CONSTRAINT "CourseSupportTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSupportMessage" ADD CONSTRAINT "CourseSupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "CourseSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseSupportMessage" ADD CONSTRAINT "CourseSupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
