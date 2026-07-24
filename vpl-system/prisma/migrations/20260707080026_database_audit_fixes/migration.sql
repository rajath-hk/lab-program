-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("action", "createdAt", "details", "id", "userId") SELECT "action", "createdAt", "details", "id", "userId" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "output" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "annotations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("annotations", "code", "createdAt", "feedback", "id", "language", "output", "questionId", "status", "studentId", "updatedAt") SELECT "annotations", "code", "createdAt", "feedback", "id", "language", "output", "questionId", "status", "studentId", "updatedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");
CREATE INDEX "Submission_questionId_idx" ON "Submission"("questionId");
CREATE INDEX "Submission_status_idx" ON "Submission"("status");
CREATE UNIQUE INDEX "Submission_studentId_questionId_key" ON "Submission"("studentId", "questionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Program_teacherId_idx" ON "Program"("teacherId");
CREATE INDEX "Program_unlockDate_idx" ON "Program"("unlockDate");
CREATE INDEX "Question_programId_idx" ON "Question"("programId");
CREATE UNIQUE INDEX "Question_programId_orderNumber_key" ON "Question"("programId", "orderNumber");
CREATE INDEX "Student_departmentId_idx" ON "Student"("departmentId");
CREATE INDEX "Student_semester_idx" ON "Student"("semester");
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");
