# Database Scripts

This directory contains scripts for managing sample data and database operations.

## Available Scripts

### 1. Clean Sample Data
```bash
npm run clean-sample-data
```
**What it does:**
- Removes all existing sample questions and problem sets
- Cleans up all related data (votes, comments, associations, etc.)
- Prepares the database for fresh sample data generation
- **Use this before generating new sample data to avoid duplicates**

### 2. Generate Sample Data
```bash
npm run generate-sample-data
```
**What it does:**
- Creates 22 sample questions (mix of MCQ and Fill-in-the-blank)
- Creates 5 problem sets covering various topics and difficulty levels
- Associates questions with problem sets
- Adds realistic metadata (upvotes, downvotes, view counts)

**Generated Content:**
- **Questions:** 22 questions covering JavaScript, Python, algorithms, data structures, and more
- **Problem Sets:** 5 problem sets with different difficulty levels and topics
- **Tags:** Comprehensive tagging system for easy filtering

## Quick Start

For a fresh start with new sample data:

```bash
# Clean existing data first
npm run clean-sample-data

# Then generate new sample data
npm run generate-sample-data
```

## Troubleshooting

### Common Issues

1. **"No questions found"** - Run `generate-sample-data` first
2. **"No problem sets found"** - Run `generate-sample-data` first  
3. **"Associations already exist"** - The data is already properly set up
4. **Database connection errors** - Check your `.env` file and database connection
5. **Duplicate questions"** - Run `clean-sample-data` first, then `generate-sample-data`

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
Created question: JavaScript Promise Methods
Created question: JavaScript Destructuring Assignment
Created question: JavaScript Event Loop
... (and many more questions)

Created problem set: JavaScript Fundamentals
Created problem set: Python Basics
... (and more problem sets)

=== Sample Data Generation Complete ===
Created 22 questions covering various topics and difficulty levels
Created 5 problem sets with comprehensive coverage
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