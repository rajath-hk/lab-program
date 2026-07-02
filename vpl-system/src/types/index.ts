import type { User, Student, Teacher, Department, Program, Question, Submission } from "@prisma/client"

export enum UserRole {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
}

export enum Difficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
  EXTREME = "EXTREME",
}

export enum SubmissionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export type StudentWithDetails = Student & {
  user: User
  department: Department
  submissions: Submission[]
}

export type ProgramWithQuestions = Program & {
  teacher: Teacher & { user: User }
  questions: Question[]
}

export type SubmissionWithDetails = Submission & {
  student: Student & {
    user: User
    department: Department
  }
  question: Question & {
    program: Program
  }
}
