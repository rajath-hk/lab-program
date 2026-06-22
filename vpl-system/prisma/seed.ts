import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@vpl.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@vpl.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@vpl.com" },
    update: {},
    create: {
      name: "Prof. Sharma",
      email: "teacher@vpl.com",
      password: hashedPassword,
      role: "TEACHER",
    },
  });

  await prisma.teacher.upsert({
    where: { employeeId: "EMP001" },
    update: {},
    create: {
      userId: teacherUser.id,
      employeeId: "EMP001",
    },
  });

  // Department
  const dept = await prisma.department.upsert({
    where: { code: "MC" },
    update: {},
    create: {
      name: "Master of Computer Applications",
      code: "MC",
    },
  });

  // Student
  const studentUser = await prisma.user.upsert({
    where: { email: "student@vpl.com" },
    update: {},
    create: {
      name: "Ramu Kumar",
      email: "student@vpl.com",
      password: hashedPassword,
      role: "STUDENT",
    },
  });

  await prisma.student.upsert({
    where: { rollNumber: "1AM25MC001" },
    update: {},
    create: {
      userId: studentUser.id,
      rollNumber: "1AM25MC001",
      departmentId: dept.id,
      semester: 1,
    },
  });

  console.log("✅ Seed complete");
  console.log(
    "Admin    → email: admin@vpl.com      | password: password123"
  );
  console.log(
    "Teacher  → email: teacher@vpl.com    | password: password123"
  );
  console.log(
    "Student  → roll:  1AM25MC001          | password: password123"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
