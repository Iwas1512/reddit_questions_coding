# Database Scripts

This directory contains scripts for managing sample data and database operations.

## Available Scripts

### 1. Generate Sample Data
```bash
npm run generate-sample-data
```
**What it does:**
- Creates 4 sample questions (2 MCQ, 2 Fill-in-the-blank)
- Creates 2 problem sets (JavaScript Fundamentals, Python Basics)
- Associates questions with problem sets
- Adds realistic metadata (upvotes, downvotes, view counts)

**Generated Content:**
- **Questions:**
  1. JavaScript Array Methods (MCQ, Easy)
  2. Python Function Definition (Fill-in-the-blank, Easy)
  3. JavaScript Closures (MCQ, Medium)
  4. Python List Comprehension (Fill-in-the-blank, Medium)

- **Problem Sets:**
  1. JavaScript Fundamentals (2 questions)
  2. Python Basics (2 questions)

### 2. Check Problem Sets
```bash
npm run check-problem-sets
```
**What it does:**
- Lists all problem sets in the database
- Shows which questions are associated with each problem set
- Displays the junction table contents
- Helps diagnose if associations are missing

### 3. Add Questions to Problem Sets
```bash
npm run add-questions-to-problem-sets
```
**What it does:**
- Takes existing questions and problem sets
- Creates associations between them if none exist
- Updates problem set question counts
- Useful if the main generation script didn't create associations properly

## Troubleshooting

### Problem Sets Have No Questions

If your problem sets don't have questions attached, try these steps:

1. **First, check what's in the database:**
   ```bash
   npm run check-problem-sets
   ```

2. **If no data exists, generate everything:**
   ```bash
   npm run generate-sample-data
   ```

3. **If problem sets exist but have no questions, add associations:**
   ```bash
   npm run add-questions-to-problem-sets
   ```

4. **Verify the fix:**
   ```bash
   npm run check-problem-sets
   ```

### Common Issues

1. **"No questions found"** - Run `generate-sample-data` first
2. **"No problem sets found"** - Run `generate-sample-data` first  
3. **"Associations already exist"** - The data is already properly set up
4. **Database connection errors** - Check your `.env` file and database connection

## Prerequisites

1. **Database Setup**: Make sure your database is running and accessible
2. **Environment Variables**: Ensure your `.env` file contains:
   ```
   DB_HOST=your_host
   DB_PORT=your_port
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```
3. **Dependencies**: Run `npm install` to install required packages

## Expected Output

After running `generate-sample-data`, you should see:
```
Created question: JavaScript Array Methods
Created question: Python Function Definition
Created question: JavaScript Closures
Created question: Python List Comprehension
Created problem set: JavaScript Fundamentals
Created problem set: Python Basics
Successfully associated questions with problem sets

=== Sample Data Generation Complete ===
Created 4 questions:
- JavaScript Array Methods (mcq, easy)
- Python Function Definition (fill_in_blank, easy)
- JavaScript Closures (mcq, medium)
- Python List Comprehension (fill_in_blank, medium)

Created 2 problem sets:
- JavaScript Fundamentals (2 questions, easy)
- Python Basics (2 questions, easy)

Question-Problem Set Associations:
- JavaScript Fundamentals: JavaScript Array Methods, JavaScript Closures
- Python Basics: Python Function Definition, Python List Comprehension
```

## Manual Database Operations

If you need to manually check or modify the database:

1. **Check all questions:**
   ```sql
   SELECT * FROM questions;
   ```

2. **Check all problem sets:**
   ```sql
   SELECT * FROM problemsets;
   ```

3. **Check associations:**
   ```sql
   SELECT * FROM problemset_questions;
   ```

4. **Check MCQ options:**
   ```sql
   SELECT * FROM mcq_options;
   ```

5. **Check fill-in-the-blank answers:**
   ```sql
   SELECT * FROM fill_blank_answers;
   ``` 