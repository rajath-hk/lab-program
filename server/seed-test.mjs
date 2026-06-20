import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findUnique({
    where: { email: 'sharma@college.edu' },
  });

  if (!teacher) {
    console.log('Teacher not found. Register first.');
    return;
  }

  console.log('Teacher ID:', teacher.id);

  const existing = await prisma.problem.count({ where: { teacherId: teacher.id } });
  console.log('Existing problems:', existing);

  if (existing === 0) {
    await prisma.problem.create({
      data: {
        title: 'Sum of Two Numbers',
        description: `# Sum of Two Numbers

Write a program that reads two integers and prints their sum.

## Input Format
Two integers separated by space.

## Output Format
Print the sum of the two integers.`,
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
        sc.close();
    }
}`,
        teacherId: teacher.id,
        testCases: {
          create: [
            { input: '3 4', expectedOutput: '7', isHidden: false },
            { input: '10 20', expectedOutput: '30', isHidden: false },
            { input: '100 200', expectedOutput: '300', isHidden: true },
          ],
        },
        hintRules: {
          create: [
            {
              regexPattern: 'Exception|Error',
              hintMessage: 'Check your input reading. Use Scanner.nextInt() to read integers.',
            },
            {
              regexPattern: 'class|Main',
              hintMessage: 'Make sure your class is named "Main" and is public.',
            },
          ],
        },
      },
    });
    console.log('Problem created successfully!');
  }

  const count = await prisma.problem.count();
  console.log('Total problems in DB:', count);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
