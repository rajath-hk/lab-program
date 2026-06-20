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

  // --- Problem 1: Sum of Two Numbers ---
  const existing1 = await prisma.problem.findFirst({
    where: { teacherId: teacher.id, title: 'Sum of Two Numbers' },
  });

  if (existing1) {
    // Update with skeleton code
    await prisma.problem.update({
      where: { id: existing1.id },
      data: {
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read two integers from input
        // Hint: Use sc.nextInt() to read each integer
        
        // TODO: Calculate the sum
        
        // TODO: Print the result
        
        sc.close();
    }
}`,
      },
    });
    console.log('Problem 1 "Sum of Two Numbers" updated with skeleton code!');
  } else {
    console.log('Problem 1 not found - skipping');
  }

  // --- Problem 2: Find the Largest Number ---
  const existing2 = await prisma.problem.findFirst({
    where: { teacherId: teacher.id, title: 'Find the Largest Number' },
  });

  if (existing2) {
    // Update with skeleton code
    await prisma.problem.update({
      where: { id: existing2.id },
      data: {
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read three integers from input
        // int a = sc.nextInt();
        // int b = sc.nextInt();
        // int c = sc.nextInt();
        
        // TODO: Find and print the largest number
        // Hint: Use if statements to compare the numbers
        
        sc.close();
    }
}`,
      },
    });
    console.log('Problem 2 "Find the Largest Number" updated with skeleton code!');
  } else {
    console.log('Problem 2 not found - creating new');
    await prisma.problem.create({
      data: {
        title: 'Find the Largest Number',
        description: `# Find the Largest Number

Write a program that reads three integers and prints the largest among them.

## Input Format
Three integers separated by spaces.

## Output Format
Print the largest of the three integers.

## Examples

**Input:**
\`\`\`
5 12 9
\`\`\`

**Output:**
\`\`\`
12
\`\`\`

**Input:**
\`\`\`
-5 0 -2
\`\`\`

**Output:**
\`\`\`
0
\`\`\`

## Constraints
- All integers are within the range of 32-bit signed integers.`,
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read three integers from input
        // int a = sc.nextInt();
        // int b = sc.nextInt();
        // int c = sc.nextInt();
        
        // TODO: Find and print the largest number
        // Hint: Use if statements to compare the numbers
        
        sc.close();
    }
}`,
        teacherId: teacher.id,
        testCases: {
          create: [
            { input: '5 12 9', expectedOutput: '12', isHidden: false },
            { input: '-5 0 -2', expectedOutput: '0', isHidden: false },
            { input: '100 50 75', expectedOutput: '100', isHidden: false },
            { input: '7 7 7', expectedOutput: '7', isHidden: true },
            { input: '1000 -1 500', expectedOutput: '1000', isHidden: true },
          ],
        },
        hintRules: {
          create: [
            {
              regexPattern: 'Exception|Error',
              hintMessage: 'Check your input reading. Use Scanner.nextInt() to read integers.',
            },
            {
              regexPattern: 'cannot find symbol',
              hintMessage: 'Make sure all variables are declared. You need variables for each integer input.',
            },
          ],
        },
      },
    });
    console.log('Problem 2 "Find the Largest Number" created!');
  }

  // --- Problem 3: Check Even or Odd ---
  const existing3 = await prisma.problem.findFirst({
    where: { teacherId: teacher.id, title: 'Check Even or Odd' },
  });

  if (existing3) {
    // Update with skeleton code
    await prisma.problem.update({
      where: { id: existing3.id },
      data: {
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read an integer from input
        // int n = sc.nextInt();
        
        // TODO: Check if the number is even or odd
        // Hint: Use the modulo operator (%)
        // If n % 2 == 0, the number is even
        
        // TODO: Print "Even" or "Odd"
        
        sc.close();
    }
}`,
      },
    });
    console.log('Problem 3 "Check Even or Odd" updated with skeleton code!');
  } else {
    console.log('Problem 3 not found - creating new');
    await prisma.problem.create({
      data: {
        title: 'Check Even or Odd',
        description: `# Check Even or Odd

Write a program that reads an integer and determines whether it is even or odd.

## Input Format
A single integer.

## Output Format
Print "Even" if the number is even, or "Odd" if the number is odd.

## Examples

**Input:**
\`\`\`
7
\`\`\`

**Output:**
\`\`\`
Odd
\`\`\`

**Input:**
\`\`\`
42
\`\`\`

**Output:**
\`\`\`
Even
\`\`\`

## Constraints
- The integer is within the range of 32-bit signed integers.
- Output is case-sensitive: "Even" and "Odd" must be capitalized.`,
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read an integer from input
        // int n = sc.nextInt();
        
        // TODO: Check if the number is even or odd
        // Hint: Use the modulo operator (%)
        // If n % 2 == 0, the number is even
        
        // TODO: Print "Even" or "Odd"
        
        sc.close();
    }
}`,
        teacherId: teacher.id,
        testCases: {
          create: [
            { input: '7', expectedOutput: 'Odd', isHidden: false },
            { input: '42', expectedOutput: 'Even', isHidden: false },
            { input: '0', expectedOutput: 'Even', isHidden: false },
            { input: '-1', expectedOutput: 'Odd', isHidden: true },
            { input: '1000000', expectedOutput: 'Even', isHidden: true },
          ],
        },
        hintRules: {
          create: [
            {
              regexPattern: 'Exception|Error',
              hintMessage: 'Check your input reading. Use Scanner.nextInt() to read the integer.',
            },
            {
              regexPattern: 'cannot find symbol',
              hintMessage: 'Make sure all variables are declared and Scanner is imported correctly.',
            },
          ],
        },
      },
    });
    console.log('Problem 3 "Check Even or Odd" created!');
  }

  // Also update seed-test.mjs Problem 1 boilerplate
  const firstProblem = await prisma.problem.findFirst({
    where: { teacherId: teacher.id, title: 'Sum of Two Numbers' },
  });
  if (firstProblem) {
    await prisma.problem.update({
      where: { id: firstProblem.id },
      data: {
        boilerplateCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // TODO: Read two integers from input
        // Hint: Use sc.nextInt() to read each integer
        
        // TODO: Calculate the sum
        
        // TODO: Print the result
        
        sc.close();
    }
}`,
      },
    });
    console.log('Problem 1 "Sum of Two Numbers" also updated!');
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
