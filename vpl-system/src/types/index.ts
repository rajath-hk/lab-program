export enum UserRole {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
}

export enum SubmissionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// Types with relations
export type StudentWithDetails = {
  id: string;
  userId: string;
  rollNumber: string;
  departmentId: string;
  semester: number;
  createdAt: Date;
  updatedAt: Date;
  // include related user and department if needed
};

export type ProgramWithQuestions = {
  id: string;
  title: string;
  description: string;
  unlockDate: Date;
  deadline?: Date | null;
  teacherId: string;
  // questions: Question[] // you can expand with related questions
};

export type SubmissionWithDetails = {
  id: string;
  studentId: string;
  questionId: string;
  code: string;
  language: string;
  output?: string | null;
  status: SubmissionStatus;
  feedback?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // include related student and question if needed
};
