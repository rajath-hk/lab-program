import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@vpl.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@vpl.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  })
  console.log(`Created admin: ${admin.email}`)

  // Create Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@vpl.com" },
    update: {},
    create: {
      name: "Prof. Sharma",
      email: "teacher@vpl.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  })

  await prisma.teacher.upsert({
    where: { employeeId: "EMP001" },
    update: {},
    create: {
      userId: teacherUser.id,
      employeeId: "EMP001",
    },
  })
  console.log(`Created teacher: ${teacherUser.email}`)

  // Create Department
  const dept = await prisma.department.upsert({
    where: { code: "MC" },
    update: {},
    create: {
      name: "Master of Computer Applications",
      code: "MC",
    },
  })
  console.log(`Created department: ${dept.name}`)

  // Create Student
  const studentUser = await prisma.user.upsert({
    where: { email: "student@vpl.com" },
    update: {},
    create: {
      name: "Ramu Kumar",
      email: "student@vpl.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  })

  await prisma.student.upsert({
    where: { rollNumber: "1AM25MC001" },
    update: {},
    create: {
      userId: studentUser.id,
      rollNumber: "1AM25MC001",
      departmentId: dept.id,
      semester: 1,
    },
  })
  console.log(`Created student: ${studentUser.name} (roll: 1AM25MC001)`)

  console.log("\n✅ Seed complete")
  console.log("Admin   → email: admin@vpl.com      | password: password123")
  console.log("Teacher → email: teacher@vpl.com    | password: password123")
  console.log("Student → roll:  1AM25MC001          | password: password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
