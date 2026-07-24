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
    where: { email: "admin@amc.edu" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@amc.edu",
      password: hashedPassword,
      role: "ADMIN",
    },
  })
  console.log(`Created admin: ${admin.email}`)

  // Create Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@amc.edu" },
    update: {},
    create: {
      name: "Prof. Sharma",
      email: "teacher@amc.edu",
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
    where: { email: "student@amc.edu" },
    update: {},
    create: {
      name: "Ramu Kumar",
      email: "student@amc.edu",
      password: hashedPassword,
      role: "STUDENT",
      isOnboarded: true,
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

  // ──────────────────────────────────────────────
  // Program 1: DBMS Lab (Oracle-Style SQL)
  // ──────────────────────────────────────────────
  const teacherProfile = await prisma.teacher.findUnique({
    where: { employeeId: "EMP001" },
  })

  if (!teacherProfile) {
    throw new Error("Teacher not found")
  }

  // Delete existing seeded programs if re-running seed
  const existingSqlProgram = await prisma.program.findFirst({
    where: {
      title: "DBMS Lab (Oracle-Style SQL)",
      teacherId: teacherProfile.id,
    },
  })

  if (existingSqlProgram) {
    // Clean up old questions, submissions, and bulk uploads
    await prisma.submission.deleteMany({
      where: { question: { programId: existingSqlProgram.id } },
    })
    await prisma.questionBulkUpload.deleteMany({
      where: { programId: existingSqlProgram.id },
    })
    await prisma.question.deleteMany({
      where: { programId: existingSqlProgram.id },
    })
    await prisma.program.delete({ where: { id: existingSqlProgram.id } })
  }

  const dbmsProgram = await prisma.program.create({
    data: {
      title: "DBMS Lab (Oracle-Style SQL)",
      description:
        "Practice Oracle-style SQL using our built-in SQL Terminal. Learn to create tables, insert data, write complex queries with JOINs, aggregations, subqueries, and more — all using standard Oracle-compatible SQL syntax directly in the terminal.",
      unlockDate: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      teacherId: teacherProfile.id,
    },
  })

  const dbmsQuestions = [
    {
      title: "CREATE TABLE & INSERT",
      description: `Write SQL statements to:

1. Create a table called "employees" with the following columns:
   - employee_id INTEGER PRIMARY KEY
   - first_name VARCHAR(50) NOT NULL
   - last_name VARCHAR(50) NOT NULL
   - email VARCHAR(100) UNIQUE
   - hire_date DATE
   - salary NUMBER(10,2)
   - department VARCHAR(50)

2. Insert at least 5 sample employee records into the table

3. Write a SELECT query to view all records

4. Write a SELECT query to view only first_name, last_name, and salary columns

Type each SQL statement ending with a semicolon (;).
Use DESC employees; to see the table structure.`,
      difficulty: "EASY",
      orderNumber: 1,
      starterCode: `CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  hire_date DATE,
  salary NUMBER(10,2),
  department VARCHAR(50)
);

INSERT INTO employees VALUES (101, 'Rahul', 'Sharma', 'rahul@example.com', '2024-01-15', 55000, 'IT');
INSERT INTO employees VALUES (102, 'Priya', 'Verma', 'priya@example.com', '2024-02-20', 62000, 'HR');
INSERT INTO employees VALUES (103, 'Amit', 'Singh', 'amit@example.com', '2024-03-10', 48000, 'Finance');
INSERT INTO employees VALUES (104, 'Neha', 'Gupta', 'neha@example.com', '2024-04-05', 71000, 'IT');
INSERT INTO employees VALUES (105, 'Vikram', 'Patel', 'vikram@example.com', '2024-05-12', 59000, 'Marketing');

SELECT * FROM employees;
SELECT first_name, last_name, salary FROM employees;`,
    },
    {
      title: "WHERE Clause & Filtering",
      description: `Using the "employees" table, write SQL queries to:

1. Find all employees who have a salary greater than 55000

2. Find all employees in the 'IT' department

3. Find employees with salary between 50000 and 65000 (use BETWEEN)

4. Find employees whose last name starts with 'S' (use LIKE)

5. Find employees in 'IT' or 'Finance' departments (use IN)

6. Find employees hired after March 1st, 2024 (use comparison on DATE)

7. Combine conditions: Find IT employees with salary > 50000 (use AND)

Execute each query separately with a semicolon.`,
      difficulty: "EASY",
      orderNumber: 2,
      starterCode: `-- Create the table first if not already done
CREATE TABLE IF NOT EXISTS employees (
  employee_id INTEGER PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  hire_date DATE,
  salary NUMBER(10,2),
  department VARCHAR(50)
);

INSERT INTO employees VALUES (101, 'Rahul', 'Sharma', 'rahul@example.com', '2024-01-15', 55000, 'IT');
INSERT INTO employees VALUES (102, 'Priya', 'Verma', 'priya@example.com', '2024-02-20', 62000, 'HR');
INSERT INTO employees VALUES (103, 'Amit', 'Singh', 'amit@example.com', '2024-03-10', 48000, 'Finance');
INSERT INTO employees VALUES (104, 'Neha', 'Gupta', 'neha@example.com', '2024-04-05', 71000, 'IT');
INSERT INTO employees VALUES (105, 'Vikram', 'Patel', 'vikram@example.com', '2024-05-12', 59000, 'Marketing');
INSERT INTO employees VALUES (106, 'Anjali', 'Saxena', 'anjali@example.com', '2024-06-01', 53000, 'IT');
INSERT INTO employees VALUES (107, 'Rohit', 'Kumar', 'rohit@example.com', '2024-07-15', 67000, 'Finance');
INSERT INTO employees VALUES (108, 'Deepika', 'Reddy', 'deepika@example.com', '2024-08-20', 44000, 'HR');

-- Query 1: Salary > 55000
SELECT * FROM employees WHERE salary > 55000;

-- Query 2: IT department
SELECT * FROM employees WHERE department = 'IT';

-- Query 3: Salary between 50000 and 65000
SELECT * FROM employees WHERE salary BETWEEN 50000 AND 65000;

-- Query 4: Last name starting with S
SELECT * FROM employees WHERE last_name LIKE 'S%';

-- Query 5: IT or Finance
SELECT * FROM employees WHERE department IN ('IT', 'Finance');

-- Query 6: Hired after March 2024
SELECT * FROM employees WHERE hire_date > '2024-03-01';

-- Query 7: IT with salary > 50000
SELECT * FROM employees WHERE department = 'IT' AND salary > 50000;`,
    },
    {
      title: "ORDER BY & Aggregation",
      description: `Write SQL queries using aggregation functions and sorting:

1. Create a "products" table with columns:
   - product_id INTEGER PRIMARY KEY
   - product_name VARCHAR(100)
   - category VARCHAR(50)
   - price NUMBER(10,2)
   - stock_quantity INTEGER

2. Insert at least 10 products across 3 different categories (e.g., Electronics, Clothing, Groceries)

3. Write and execute these queries:
   a. List all products sorted by price ascending (ORDER BY)
   b. List all products sorted by price descending
   c. Find total number of products (COUNT)
   d. Find average price of all products (AVG)
   e. Find highest and lowest price (MAX, MIN)
   f. Find total stock quantity across all products (SUM)
   g. Group products by category and show count per category (GROUP BY)
   h. Show categories with average price > 500 (GROUP BY + HAVING)

Label your results clearly.`,
      difficulty: "MEDIUM",
      orderNumber: 3,
      starterCode: `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name VARCHAR(100),
  category VARCHAR(50),
  price NUMBER(10,2),
  stock_quantity INTEGER
);

INSERT INTO products VALUES (1, 'Laptop', 'Electronics', 75000, 10);
INSERT INTO products VALUES (2, 'Smartphone', 'Electronics', 35000, 25);
INSERT INTO products VALUES (3, 'Headphones', 'Electronics', 2500, 50);
INSERT INTO products VALUES (4, 'T-Shirt', 'Clothing', 800, 100);
INSERT INTO products VALUES (5, 'Jeans', 'Clothing', 2000, 60);
INSERT INTO products VALUES (6, 'Jacket', 'Clothing', 3500, 30);
INSERT INTO products VALUES (7, 'Rice 5kg', 'Groceries', 350, 200);
INSERT INTO products VALUES (8, 'Cooking Oil', 'Groceries', 220, 150);
INSERT INTO products VALUES (9, 'Spices Pack', 'Groceries', 150, 300);
INSERT INTO products VALUES (10, 'Tablet', 'Electronics', 18000, 15);

SELECT * FROM products ORDER BY price;
SELECT * FROM products ORDER BY price DESC;
SELECT COUNT(*) AS total_products FROM products;
SELECT AVG(price) AS average_price FROM products;
SELECT MAX(price) AS max_price, MIN(price) AS min_price FROM products;
SELECT SUM(stock_quantity) AS total_stock FROM products;
SELECT category, COUNT(*) AS product_count FROM products GROUP BY category;
SELECT category, AVG(price) AS avg_price FROM products GROUP BY category HAVING AVG(price) > 500;`,
    },
    {
      title: "JOINs: Working with Multiple Tables",
      description: `Design a mini e-commerce database and demonstrate JOIN operations:

1. Create three related tables:

   customers:
   - customer_id INTEGER PRIMARY KEY
   - name VARCHAR(100)
   - email VARCHAR(100)
   - city VARCHAR(50)

   orders:
   - order_id INTEGER PRIMARY KEY
   - customer_id INTEGER REFERENCES customers(customer_id)
   - order_date DATE
   - total_amount NUMBER(10,2)

   order_items:
   - item_id INTEGER PRIMARY KEY
   - order_id INTEGER REFERENCES orders(order_id)
   - product_name VARCHAR(100)
   - quantity INTEGER
   - unit_price NUMBER(10,2)

2. Insert sample data (5 customers, 8 orders, 12 order items)

3. Execute these JOIN queries:
   a. INNER JOIN: Show customers with their orders
   b. LEFT JOIN: Show all customers and their orders (even those without orders)
   c. Multiple JOINs: Show order details with customer and product info
   d. Aggregate with JOIN: Total spent by each customer

Use DESCRIBE-like DESC command to view each table structure.`,
      difficulty: "MEDIUM",
      orderNumber: 4,
      starterCode: `CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  city VARCHAR(50)
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date DATE,
  total_amount NUMBER(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
  item_id INTEGER PRIMARY KEY,
  order_id INTEGER,
  product_name VARCHAR(100),
  quantity INTEGER,
  unit_price NUMBER(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

INSERT INTO customers VALUES (1, 'Rajesh', 'rajesh@email.com', 'Delhi');
INSERT INTO customers VALUES (2, 'Sneha', 'sneha@email.com', 'Mumbai');
INSERT INTO customers VALUES (3, 'Arjun', 'arjun@email.com', 'Bangalore');
INSERT INTO customers VALUES (4, 'Kavita', 'kavita@email.com', 'Chennai');
INSERT INTO customers VALUES (5, 'Manish', 'manish@email.com', 'Pune');

INSERT INTO orders VALUES (101, 1, '2024-01-15', 1500);
INSERT INTO orders VALUES (102, 2, '2024-02-10', 2500);
INSERT INTO orders VALUES (103, 1, '2024-03-05', 800);
INSERT INTO orders VALUES (104, 3, '2024-03-20', 3200);
INSERT INTO orders VALUES (105, 2, '2024-04-12', 1750);
INSERT INTO orders VALUES (106, 4, '2024-05-01', 4200);
INSERT INTO orders VALUES (107, 3, '2024-05-15', 950);
INSERT INTO orders VALUES (108, 5, '2024-06-01', 2800);

INSERT INTO order_items VALUES (1, 101, 'Mouse', 2, 500);
INSERT INTO order_items VALUES (2, 101, 'Keyboard', 1, 500);
INSERT INTO order_items VALUES (3, 102, 'Monitor', 1, 2000);
INSERT INTO order_items VALUES (4, 102, 'Cable', 2, 250);
INSERT INTO order_items VALUES (5, 103, 'Mouse Pad', 3, 100);
INSERT INTO order_items VALUES (6, 104, 'Laptop Bag', 1, 1500);
INSERT INTO order_items VALUES (7, 104, 'USB Hub', 2, 850);
INSERT INTO order_items VALUES (8, 105, 'Webcam', 1, 1200);
INSERT INTO order_items VALUES (9, 105, 'Headset', 1, 550);
INSERT INTO order_items VALUES (10, 106, 'Printer', 1, 3500);
INSERT INTO order_items VALUES (11, 107, 'Mouse', 1, 500);
INSERT INTO order_items VALUES (12, 108, 'Desk Lamp', 2, 400);
INSERT INTO order_items VALUES (13, 108, 'Notebook', 5, 200);

-- INNER JOIN: Customers with their orders
SELECT c.name, c.email, o.order_id, o.order_date, o.total_amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;

-- LEFT JOIN: All customers and their orders
SELECT c.name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;

-- Multiple JOINs: Order items with customer info
SELECT c.name, o.order_id, oi.product_name, oi.quantity, oi.unit_price
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id;

-- Aggregate with JOIN: Total spent per customer
SELECT c.name, SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.name
ORDER BY total_spent DESC;`,
    },
    {
      title: "Subqueries & Nested Queries",
      description: `Write SQL queries using subqueries (nested queries):

Use the customers, orders, and order_items tables from the previous exercise.

1. Find customers who have placed orders above the average order amount
   (Subquery in WHERE clause)

2. Find products that have been ordered more than the average quantity
   (Subquery in WHERE with comparison)

3. Show each customer's total spending along with the overall average
   (Subquery in SELECT clause)

4. Find customers who have never placed an order
   (Subquery with NOT EXISTS)

5. Find the most expensive product in each order
   (Correlated subquery)

6. Find customers whose total spending is above average
   (Subquery in HAVING clause)

Execute each query separately and label the results.`,
      difficulty: "HARD",
      orderNumber: 5,
      starterCode: `-- Setup: Use tables from previous exercise

-- 1. Customers with orders above average amount
SELECT DISTINCT c.name, c.email
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.total_amount > (SELECT AVG(total_amount) FROM orders);

-- 2. Products ordered more than average quantity
SELECT DISTINCT oi.product_name
FROM order_items oi
WHERE oi.quantity > (SELECT AVG(quantity) FROM order_items);

-- 3. Each customer's total vs overall average
SELECT c.name,
       (SELECT SUM(o.total_amount) FROM orders o WHERE o.customer_id = c.customer_id) AS total_spent,
       (SELECT AVG(total_amount) FROM orders) AS overall_avg
FROM customers c;

-- 4. Customers who never placed an order
SELECT c.name, c.email
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

-- 5. Most expensive product in each order
SELECT o.order_id, oi.product_name, oi.unit_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
WHERE oi.unit_price = (SELECT MAX(oi2.unit_price) FROM order_items oi2 WHERE oi2.order_id = oi.order_id);

-- 6. Customers with above-average total spending
SELECT c.name, SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.name
HAVING SUM(o.total_amount) > (SELECT AVG(total_amount) FROM orders);`,
    },
    {
      title: "DDL: Constraints & Schema Design",
      description: `Design a normalized library management system schema with constraints:

1. Create the following tables with proper constraints:

   authors:
   - author_id INTEGER PRIMARY KEY
   - name VARCHAR(100) NOT NULL
   - birth_year INTEGER
   - country VARCHAR(50) DEFAULT 'India'

   books:
   - book_id INTEGER PRIMARY KEY
   - title VARCHAR(200) NOT NULL
   - author_id INTEGER REFERENCES authors(author_id)
   - published_year INTEGER CHECK(published_year >= 1900)
   - isbn VARCHAR(20) UNIQUE NOT NULL
   - copies_available INTEGER DEFAULT 1 CHECK(copies_available >= 0)

   members:
   - member_id INTEGER PRIMARY KEY
   - name VARCHAR(100) NOT NULL
   - phone VARCHAR(15) UNIQUE
   - join_date DATE DEFAULT CURRENT_DATE

   borrowings:
   - borrowing_id INTEGER PRIMARY KEY
   - book_id INTEGER REFERENCES books(book_id)
   - member_id INTEGER REFERENCES members(member_id)
   - borrow_date DATE DEFAULT CURRENT_DATE
   - return_date DATE
   - status VARCHAR(20) DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'RETURNED', 'OVERDUE'))

2. Insert sample data (4 authors, 6 books, 4 members, 5 borrowings)

3. Use DESC command to verify table structures

4. Demonstrate queries using the schema

5. Try inserting invalid data (e.g., book with negative copies) and observe the constraint violation`,
      difficulty: "HARD",
      orderNumber: 6,
      starterCode: `CREATE TABLE authors (
  author_id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  birth_year INTEGER,
  country VARCHAR(50) DEFAULT 'India'
);

CREATE TABLE books (
  book_id INTEGER PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author_id INTEGER,
  published_year INTEGER CHECK(published_year >= 1900),
  isbn VARCHAR(20) UNIQUE NOT NULL,
  copies_available INTEGER DEFAULT 1 CHECK(copies_available >= 0),
  FOREIGN KEY (author_id) REFERENCES authors(author_id)
);

CREATE TABLE members (
  member_id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE,
  join_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE borrowings (
  borrowing_id INTEGER PRIMARY KEY,
  book_id INTEGER,
  member_id INTEGER,
  borrow_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  status VARCHAR(20) DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'RETURNED', 'OVERDUE')),
  FOREIGN KEY (book_id) REFERENCES books(book_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

INSERT INTO authors VALUES (1, 'R.K. Narayan', 1906, 'India');
INSERT INTO authors VALUES (2, 'J.K. Rowling', 1965, 'UK');
INSERT INTO authors VALUES (3, 'Chetan Bhagat', 1974, 'India');
INSERT INTO authors VALUES (4, 'Agatha Christie', 1890, 'UK');

INSERT INTO books VALUES (101, 'The Guide', 1, 1958, '9780143068185', 3);
INSERT INTO books VALUES (102, 'Harry Potter and the Philosopher''s Stone', 2, 1997, '9780747532699', 5);
INSERT INTO books VALUES (103, 'Five Point Someone', 3, 2004, '9788129112240', 4);
INSERT INTO books VALUES (104, 'Murder on the Orient Express', 4, 1934, '9780007119318', 2);
INSERT INTO books VALUES (105, 'Malgudi Days', 1, 1943, '9780143039659', 2);
INSERT INTO books VALUES (106, 'The White Tiger', 1, 2008, '9781416562603', 3);

INSERT INTO members VALUES (1, 'Aarav Mehta', '9876543210', '2024-01-10');
INSERT INTO members VALUES (2, 'Isha Patel', '9876543211', '2024-02-15');
INSERT INTO members VALUES (3, 'Rohan Desai', '9876543212', '2024-03-20');
INSERT INTO members VALUES (4, 'Maya Krishnan', '9876543213', '2024-04-05');

INSERT INTO borrowings VALUES (1, 101, 1, '2024-06-01', NULL, 'ISSUED');
INSERT INTO borrowings VALUES (2, 102, 2, '2024-06-10', '2024-06-24', 'RETURNED');
INSERT INTO borrowings VALUES (3, 103, 3, '2024-06-15', NULL, 'ISSUED');
INSERT INTO borrowings VALUES (4, 104, 1, '2024-07-01', NULL, 'OVERDUE');
INSERT INTO borrowings VALUES (5, 106, 4, '2024-07-10', NULL, 'ISSUED');

-- View table structures
DESC authors;
DESC books;
DESC members;
DESC borrowings;

-- Query: Books currently issued
SELECT b.title, a.name AS author, m.name AS borrower, br.borrow_date
FROM borrowings br
JOIN books b ON br.book_id = b.book_id
JOIN authors a ON b.author_id = a.author_id
JOIN members m ON br.member_id = m.member_id
WHERE br.status = 'ISSUED';

-- Try violating constraint (will fail):
-- INSERT INTO books VALUES (999, 'Bad Book', 1, 1800, '0000000000', -1);`,
    },
    {
      title: "Advanced Queries: Views, Functions & Indexes",
      description: `Demonstrate advanced Oracle-style database features:

1. Create a VIEW called "employee_summary" that shows:
   - Full name (first_name || ' ' || last_name)
   - Department
   - Annual salary (salary * 12)
   - Salary grade: 'High' if salary > 60000, 'Medium' if > 40000, else 'Low'
   (Use CASE expression)

2. Query the view

3. Create INDEX on the department column and show query plan

4. Use string functions:
   - UPPER() to convert names to uppercase
   - SUBSTR() to extract first 3 characters of department
   - LENGTH() to find name length

5. Use date functions:
   - Find employees hired in 2024 (use STRFTIME or date comparison)
   - Calculate days since hire date

6. Demonstrate the use of CAST and COALESCE

Note: Use SQLite-compatible functions where Oracle-specific ones differ.`,
      difficulty: "EXTREME",
      orderNumber: 7,
      starterCode: `-- Setup sample data
CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100),
  hire_date DATE,
  salary NUMBER(10,2),
  department VARCHAR(50),
  bonus NUMBER(10,2)
);

INSERT INTO employees VALUES (1, 'Rahul', 'Sharma', 'rahul@corp.com', '2024-01-15', 75000, 'IT', 5000);
INSERT INTO employees VALUES (2, 'Priya', 'Verma', 'priya@corp.com', '2024-02-20', 55000, 'HR', NULL);
INSERT INTO employees VALUES (3, 'Amit', 'Singh', 'amit@corp.com', '2023-11-10', 45000, 'Finance', 2000);
INSERT INTO employees VALUES (4, 'Neha', 'Gupta', 'neha@corp.com', '2024-04-05', 85000, 'IT', 8000);
INSERT INTO employees VALUES (5, 'Vikram', 'Patel', 'vikram@corp.com', '2023-06-12', 38000, 'Marketing', NULL);

-- Create a view
CREATE VIEW employee_summary AS
SELECT first_name || ' ' || last_name AS full_name,
       department,
       salary * 12 AS annual_salary,
       CASE
         WHEN salary > 60000 THEN 'High'
         WHEN salary > 40000 THEN 'Medium'
         ELSE 'Low'
       END AS salary_grade,
       COALESCE(bonus, 0) AS bonus
FROM employees;

-- Query the view
SELECT * FROM employee_summary;

-- String functions
SELECT first_name, UPPER(first_name) AS upper_name, LENGTH(first_name) AS name_length
FROM employees;

SELECT department, SUBSTR(department, 1, 3) AS dept_code
FROM employees;

-- Date functions (SQLite-compatible)
SELECT first_name, last_name, hire_date
FROM employees
WHERE hire_date >= '2024-01-01';

SELECT first_name, last_name,
       CAST(julianday('now') - julianday(hire_date) AS INTEGER) AS days_since_hire
FROM employees;

-- Create index and show query plan
CREATE INDEX idx_employees_dept ON employees(department);

EXPLAIN QUERY PLAN SELECT * FROM employees WHERE department = 'IT';`,
    },
  ]

  for (const q of dbmsQuestions) {
    await prisma.question.create({
      data: {
        programId: dbmsProgram.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty as any,
        orderNumber: q.orderNumber,
        starterCode: q.starterCode,
      },
    })
  }
  console.log(`Created program: "${dbmsProgram.title}" with ${dbmsQuestions.length} questions`)

  // ──────────────────────────────────────────────
  // Program 2: Network Simulation
  // ──────────────────────────────────────────────
  const existingNetProgram = await prisma.program.findFirst({
    where: {
      title: "Network Simulation",
      teacherId: teacherProfile.id,
    },
  })

  if (existingNetProgram) {
    await prisma.submission.deleteMany({
      where: { question: { programId: existingNetProgram.id } },
    })
    await prisma.questionBulkUpload.deleteMany({
      where: { programId: existingNetProgram.id },
    })
    await prisma.question.deleteMany({
      where: { programId: existingNetProgram.id },
    })
    await prisma.program.delete({ where: { id: existingNetProgram.id } })
  }

  const netProgram = await prisma.program.create({
    data: {
      title: "Network Simulation",
      description:
        "Explore core computer networking concepts through hands-on Python simulations. Learn how data flows across networks by implementing TCP/UDP communication, building a simple chat server, analyzing network packets, simulating routing algorithms, and understanding HTTP protocols — all using Python's standard library.",
      unlockDate: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      teacherId: teacherProfile.id,
    },
  })

  const netQuestions = [
    {
      title: "Simple TCP Echo Server",
      description: `Build a simple TCP echo server and client in Python using the socket module:

1. Create a TCP echo server that:
   - Listens on localhost (127.0.0.1) on port 12345
   - Accepts client connections
   - Receives data from the client
   - Sends back the same data (echo)
   - Handles multiple clients sequentially
   - Gracefully handles connection errors

2. Create a TCP echo client that:
   - Connects to the server at 127.0.0.1:12345
   - Sends at least 3 different messages
   - Receives and prints the echoed response
   - Closes the connection properly

Run the server and client to demonstrate communication.
Note: The server should run first and then the client sends messages.`,
      difficulty: "EASY",
      orderNumber: 1,
      starterCode: `import socket

def run_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("127.0.0.1", 12345))
    server.listen(1)
    print("Echo server listening on port 12345...")
    
    # Your code here - accept connections and echo data

def run_client():
    # Your code here - connect and send messages
    pass

# Run both in same process for testing
import threading
t = threading.Thread(target=run_server, daemon=True)
t.start()

import time
time.sleep(0.5)
run_client()`,
    },
    {
      title: "UDP Chat Application",
      description: `Create a simple chat application using UDP sockets:

1. Implement a chat program using UDP (SOCK_DGRAM) that:
   - Allows multiple users to communicate on the same port
   - Sends messages to a broadcast address or specific peer
   - Receives messages in a non-blocking manner
   - Uses a simple protocol: "username: message"

2. Simulate a chat session where:
   - User "Alice" sends 3 messages to port 12346
   - User "Bob" sends 2 messages to port 12346
   - All messages are displayed with sender names

3. Add error handling for:
   - Port already in use
   - Network unreachable
   - Message too large (UDP limit ~65507 bytes)

Use threading to simulate both users simultaneously.`,
      difficulty: "MEDIUM",
      orderNumber: 2,
      starterCode: `import socket
import threading
import time

def chat_user(name, messages, host="127.0.0.1", port=12346):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.5)
    
    # Bind to receive messages
    sock.bind((host, port))
    
    def receive():
        while True:
            try:
                data, addr = sock.recvfrom(1024)
                print(f"[RECEIVED] {data.decode()}")
            except socket.timeout:
                continue
            except:
                break
    
    # Start receiver thread
    t = threading.Thread(target=receive, daemon=True)
    t.start()
    
    # Your code here - send messages
    
    time.sleep(1)
    sock.close()

# Simulate two users
t1 = threading.Thread(target=chat_user, args=("Alice", ["Hi everyone!", "How are you?", "UDP is fun!"]))
t2 = threading.Thread(target=chat_user, args=("Bob", ["Hello Alice!", "I'm good, thanks!"]))

t1.start()
t2.start()
t1.join()
t2.join()`,
    },
    {
      title: "HTTP Client from Scratch",
      description: `Build a simple HTTP/1.1 client from scratch using raw TCP sockets:

1. Write a Python function http_get(url) that:
   - Parses the URL to extract hostname and path
   - Creates a TCP connection to the server on port 80
   - Sends a properly formatted HTTP GET request
   - Receives and parses the HTTP response
   - Extracts and returns: status code, headers (as dict), and body

2. Test your client by fetching from:
   - http://example.com/
   - http://httpbin.org/get (returns request info as JSON)

3. Add features:
   - Handle redirects (301/302 status codes)
   - Set a custom User-Agent header
   - Handle chunked transfer encoding
   - Timeout handling

4. Compare your responses with Python's built-in urllib or requests`,
      difficulty: "HARD",
      orderNumber: 3,
      starterCode: `import socket

def http_get(url):
    """
    Fetch a URL using raw HTTP/1.1 over TCP.
    Returns (status_code, headers_dict, body)
    """
    # Parse URL
    if url.startswith("http://"):
        url = url[7:]
    
    path = "/"
    if "/" in url:
        hostname, path = url.split("/", 1)
        path = "/" + path
    else:
        hostname = url
    
    # Your code here - create socket, send request, parse response
    pass

# Test your client
print("Testing http://example.com/")
status, headers, body = http_get("http://example.com/")
print(f"Status: {status}")
print(f"Headers: {dict(headers)}")
print(f"Body (first 200 chars): {body[:200]}...")

# Test with httpbin
print("\\nTesting http://httpbin.org/get")
status2, headers2, body2 = http_get("http://httpbin.org/get")
print(f"Status: {status2}")
print(f"Body: {body2}")`,
    },
    {
      title: "Distance Vector Routing Simulation",
      description: `Implement a simplified Distance Vector Routing (Bellman-Ford) algorithm simulation:

1. Create a network topology represented as a graph with at least 6 nodes (A, B, C, D, E, F)
2. Each node has direct links with associated costs to its neighbors
3. Implement:
   - A routing table for each node (destination, next hop, cost)
   - Periodic exchange of routing tables between neighbors
   - Update rules based on Bellman-Ford equation: d[x][y] = min(cost(x, v) + d[v][y]) for all neighbors v
   - Convergence detection (when no routes change)

4. Network topology:
   A - B (cost 2)
   A - C (cost 5)
   B - C (cost 1)
   B - D (cost 3)
   C - E (cost 2)
   D - E (cost 1)
   D - F (cost 4)
   E - F (cost 3)

5. After convergence, simulate a link failure (e.g., B-D link goes down) and show how routes update

Print routing tables for all nodes at each iteration.`,
      difficulty: "HARD",
      orderNumber: 4,
      starterCode: `from copy import deepcopy

# Define network topology: adjacency list with costs
network = {
    "A": {"B": 2, "C": 5},
    "B": {"A": 2, "C": 1, "D": 3},
    "C": {"A": 5, "B": 1, "E": 2},
    "D": {"B": 3, "E": 1, "F": 4},
    "E": {"C": 2, "D": 1, "F": 3},
    "F": {"D": 4, "E": 3},
}

nodes = list(network.keys())

# Initialize routing tables (distance vectors)
routing_tables = {}
for node in nodes:
    routing_tables[node] = {dest: float("inf") for dest in nodes}
    routing_tables[node][node] = 0
    for neighbor, cost in network[node].items():
        routing_tables[node][neighbor] = cost

def print_all_tables(tables, iteration):
    print(f"\\n=== Iteration {iteration} ===")
    for node, table in tables.items():
        print(f"\\n{node}'s routing table:")
        print(f"  {'Dest':>4} | {'Cost':>4}")
        print(f"  {'-'*4}-+-{'-'*4}")
        for dest, cost in table.items():
            if cost != float("inf"):
                print(f"  {dest:>4} | {cost:>4}")
            else:
                print(f"  {dest:>4} | {'∞':>4}")

def distance_vector_routing(tables, network):
    # Your code here - implement Bellman-Ford updates
    pass

distance_vector_routing(routing_tables, network)`,
    },
    {
      title: "Simple Packet Sniffer & Analyzer",
      description: `Build a simple packet capture and analysis tool using raw sockets:

1. Create a packet sniffer that:
   - Captures network packets on a given interface (use localhost for testing)
   - Parses Ethernet, IP, TCP, and UDP headers
   - Displays key information:
     - Source and destination MAC addresses
     - Source and destination IP addresses
     - Protocol type (TCP/UDP/ICMP)
     - Source and destination ports
     - Packet size
     - Payload (first 64 bytes in hex and ASCII)

2. Structure your headers using Python's struct module to unpack binary data:
   - Ethernet header: 14 bytes (6 dest MAC, 6 src MAC, 2 EtherType)
   - IP header: 20 bytes minimum (version, IHL, TOS, total length, id, flags, fragment, TTL, protocol, checksum, src IP, dest IP)
   - TCP header: 20 bytes minimum (src port, dest port, seq num, ack num, data offset, flags, window, checksum, urgent pointer)
   - UDP header: 8 bytes (src port, dest port, length, checksum)

3. Since raw sockets require admin privileges, simulate by reading a sample PCAP file or use a pre-captured packet hex dump for parsing`,
      difficulty: "EXTREME",
      orderNumber: 5,
      starterCode: `import struct
import textwrap

# Sample raw packet (hex dump of an actual TCP packet)
# Ethernet (14 bytes) + IP (20 bytes) + TCP (20 bytes) + payload
sample_packet_hex = (
    "001122334455" +  # Dest MAC
    "AABBCCDDEEFF" +  # Src MAC
    "0800" +          # EtherType (IPv4)
    "4500" +          # Version=4, IHL=5, DSCP=0, ECN=0, Total Length=?
    "0034" +          # Total Length (52 bytes)
    "0000" +          # Identification
    "4000" +          # Flags+Fragment Offset
    "40" +            # TTL (64)
    "06" +            # Protocol (TCP = 6)
    "0000" +          # Header Checksum
    "C0A80001" +      # Source IP (192.168.0.1)
    "C0A80002" +      # Dest IP (192.168.0.2)
    "1F90" +          # Source Port (8080)
    "0050" +          # Dest Port (80)
    "00000001" +      # Sequence Number
    "00000000" +      # Acknowledgment Number
    "50" +            # Data Offset + Reserved
    "18" +            # Flags (ACK + PSH)
    "FFFF" +          # Window Size
    "0000" +          # Checksum
    "0000" +          # Urgent Pointer
    "48656C6C6F" +    # Payload: "Hello"
    "20576F726C6421"  # Payload: " World!"
)

def parse_ethernet_header(data):
    # Your code here - parse 14 byte Ethernet header
    pass

def parse_ip_header(data):
    # Your code here - parse IP header (minimum 20 bytes)
    pass

def parse_tcp_header(data):
    # Your code here - parse TCP header (minimum 20 bytes)
    pass

def parse_packet(hex_data):
    print("=" * 60)
    print("PACKET ANALYSIS")
    print("=" * 60)
    
    raw_bytes = bytes.fromhex(hex_data.replace(" ", ""))
    offset = 0
    
    # Parse headers
    offset = parse_ethernet_header(raw_bytes[offset:offset+14])
    offset = parse_ip_header(raw_bytes[offset:])
    offset = parse_tcp_header(raw_bytes[offset:])
    
    # Remaining is payload
    payload = raw_bytes[offset:]
    print(f"\\nPayload ({len(payload)} bytes):")
    print(f"ASCII: {''.join(chr(b) if 32 <= b < 127 else '.' for b in payload)}")

parse_packet(sample_packet_hex)`,
    },
    {
      title: "Client-Server File Transfer",
      description: `Implement a reliable file transfer protocol over TCP:

1. Create a file server that:
   - Listens on port 12347
   - Accepts client commands:
     * LIST - List available files
     * GET <filename> - Download a file
     * PUT <filename> <size> <data> - Upload a file
     * DELETE <filename> - Delete a file
   - Handles multiple clients using threading
   - Stores files in a "server_files" directory

2. Create a file client that:
   - Connects to the server
   - Provides a command-line interface
   - Can send/receive files with progress indication
   - Handles errors gracefully

3. Implement:
   - File size checking before transfer
   - Checksum verification (simple hash)
   - Concurrent client handling
   - Proper connection cleanup

Simulate a session: list files, upload a test file, download it back, verify integrity.`,
      difficulty: "EXTREME",
      orderNumber: 6,
      starterCode: `import socket
import threading
import os
import hashlib

SERVER_DIR = "server_files"
HOST = "127.0.0.1"
PORT = 12347

def handle_client(conn, addr):
    print(f"[NEW CONNECTION] {addr}")
    connected = True
    while connected:
        try:
            data = conn.recv(4096).decode()
            if not data:
                break
            
            parts = data.strip().split(maxsplit=1)
            cmd = parts[0].upper()
            
            if cmd == "LIST":
                # Your code here - list files
                pass
            elif cmd == "GET":
                # Your code here - send file
                pass
            elif cmd == "PUT":
                # Your code here - receive file
                pass
            elif cmd == "DELETE":
                # Your code here - delete file
                pass
            else:
                conn.send("ERROR: Unknown command".encode())
        except Exception as e:
            print(f"[ERROR] {e}")
            break
    
    conn.close()

def start_server():
    os.makedirs(SERVER_DIR, exist_ok=True)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen()
    print(f"[LISTENING] File server on {HOST}:{PORT}")
    
    # Your code here - accept connections in a loop

def run_client():
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((HOST, PORT))
    
    # Your code here - interactive file operations

# Run for testing
import time
t = threading.Thread(target=start_server, daemon=True)
t.start()
time.sleep(0.5)
run_client()`,
    },
  ]

  for (const q of netQuestions) {
    await prisma.question.create({
      data: {
        programId: netProgram.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty as any,
        orderNumber: q.orderNumber,
        starterCode: q.starterCode,
      },
    })
  }
  console.log(`Created program: "${netProgram.title}" with ${netQuestions.length} questions`)

  console.log("\n✅ Seed complete")
  console.log("Admin   → email: admin@amc.edu      | password: password123")
  console.log("Teacher → email: teacher@amc.edu    | password: password123")
  console.log("Student → roll:  1AM25MC001          | password: password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
