import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

type ActionType =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_DEPARTMENT"
  | "UPDATE_DEPARTMENT"
  | "DELETE_DEPARTMENT"
  | "CREATE_PROGRAM"
  | "UPDATE_PROGRAM"
  | "DELETE_PROGRAM"
  | "CREATE_QUESTION"
  | "UPDATE_QUESTION"
  | "DELETE_QUESTION"
  | "SUBMIT_CODE"
  | "REVIEW_SUBMISSION"
  | "CREATE_BULK_UPLOAD"
  | "TAB_SWITCH"
  | "COMPLETE_ONBOARDING"
  | "BULK_IMPORT_STUDENTS"

export async function logActivity(
  userId: string,
  action: ActionType,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    })
  } catch (error) {
    // Fail silently — logging should never break the main flow
    console.error("Failed to log activity:", error)
  }
}

export type { ActionType }
