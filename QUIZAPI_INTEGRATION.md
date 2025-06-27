# QuizAPI Integration

This document explains how to use the QuizAPI integration feature to import external questions into your algozero platform.

## Overview

The QuizAPI integration allows admins to import technical questions from [QuizAPI.io](https://quizapi.io) into your question database. This feature provides access to a large collection of programming, Linux, DevOps, networking, and other technical questions.

## Features

- **Preview Questions**: See questions before importing them
- **Category Filtering**: Filter by specific categories (Linux, Programming, DevOps, etc.)
- **Difficulty Filtering**: Filter by difficulty level (Easy, Medium, Hard)
- **Bulk Import**: Import multiple questions at once
- **Auto-tagging**: Questions are automatically tagged based on their category
- **Duplicate Prevention**: Prevents importing the same question twice
- **Import Statistics**: Track your import history and statistics

## Setup

### 1. Get a QuizAPI Key

1. Visit [QuizAPI.io](https://quizapi.io/docs/1.0/overview)
2. Sign up for a free account
3. Get your API key (free for development, open-source, and non-commercial use)

### 2. Configure Environment

Add your QuizAPI key to your backend `.env` file:

```bash
QUIZAPI_KEY=your-actual-api-key-here
```

### 3. Test the Integration

Run the test script to verify everything is working:

```bash
cd reddit_questions_coding
node test-quizapi.js
```

## Usage

### Accessing the QuizAPI Importer

1. Log in as an admin user
2. Click the "QUIZAPI" tab in the admin section
3. You'll see three tabs: Preview, Import, and Statistics

### Preview Questions

1. Select a category (optional)
2. Select a difficulty level (optional)
3. Choose the number of questions to preview (1-20)
4. Click "Preview Questions"
5. Review the questions and their answers

### Import Questions

1. Choose the number of questions to import (limited by your question vouchers)
2. Select category and difficulty filters (optional)
3. Choose whether to auto-verify imported questions
4. Click "Import Questions"
5. Review the import results

### View Statistics

The Statistics tab shows:
- Total questions imported
- Breakdown by difficulty level
- Import history by month

## API Endpoints

### Backend Routes

- `GET /api/quizapi/categories` - Get available categories and difficulties
- `GET /api/quizapi/preview` - Preview questions (admin only)
- `POST /api/quizapi/import` - Import questions (admin only)
- `GET /api/quizapi/stats` - Get import statistics (admin only)

### Request Parameters

#### Preview Questions
```javascript
GET /api/quizapi/preview?limit=5&category=Linux&difficulty=Easy
```

#### Import Questions
```javascript
POST /api/quizapi/import
{
  "limit": 10,
  "category": "Programming",
  "difficulty": "Medium",
  "autoVerify": false
}
```

## Question Format Conversion

The integration automatically converts QuizAPI questions to your app's format:

### QuizAPI Format
```json
{
  "id": 1,
  "question": "How to delete a directory in Linux?",
  "description": "delete folder",
  "answers": {
    "answer_a": "ls",
    "answer_b": "delete",
    "answer_c": "remove",
    "answer_d": "rmdir"
  },
  "correct_answers": {
    "answer_a_correct": "false",
    "answer_b_correct": "false",
    "answer_c_correct": "false",
    "answer_d_correct": "true"
  },
  "explanation": "rmdir deletes an empty directory",
  "category": "linux",
  "difficulty": "Easy"
}
```

### Converted Format
```json
{
  "title": "How to delete a directory in Linux?",
  "question_text": "delete folder",
  "question_type": "mcq",
  "difficulty_level": "easy",
  "explanation": "rmdir deletes an empty directory",
  "mcqOptions": [
    { "option_text": "ls", "is_correct": false },
    { "option_text": "delete", "is_correct": false },
    { "option_text": "remove", "is_correct": false },
    { "option_text": "rmdir", "is_correct": true }
  ],
  "tags": ["linux"],
  "source": "quizapi",
  "external_id": "1"
}
```

## Available Categories

- Linux
- DevOps
- Networking
- Programming
- Cloud
- Docker
- Kubernetes
- PHP
- JavaScript
- Python
- SQL
- HTML
- CSS

## Cost and Limits

- **Question Vouchers**: Each imported question costs 1 question voucher
- **API Limits**: QuizAPI has rate limits for free accounts
- **Duplicate Prevention**: Questions with the same external ID won't be imported twice

## Error Handling

The integration includes comprehensive error handling:

- **API Key Missing**: Clear error message if QUIZAPI_KEY is not configured
- **Network Errors**: Handles API timeouts and connection issues
- **Rate Limiting**: Respects QuizAPI rate limits
- **Duplicate Detection**: Prevents importing the same question multiple times
- **Voucher Validation**: Ensures users have enough vouchers before importing

## Security

- **Admin Only**: All QuizAPI endpoints require admin privileges
- **Environment Variables**: API key is stored securely in environment variables
- **Input Validation**: All user inputs are validated and sanitized
- **Transaction Safety**: Database operations use transactions for data integrity

## Troubleshooting

### Common Issues

1. **"API key is not configured"**
   - Add QUIZAPI_KEY to your .env file
   - Restart your backend server

2. **"Not enough question vouchers"**
   - Answer more questions to earn vouchers
   - Get upvotes on your answers to earn reputation

3. **"Failed to fetch questions from QuizAPI"**
   - Check your internet connection
   - Verify your API key is correct
   - Check if you've hit rate limits

4. **Questions not appearing after import**
   - Check if questions were auto-verified
   - Verify the import was successful in the Statistics tab

### Testing

Run the test script to diagnose issues:

```bash
node test-quizapi.js
```

## Support

- QuizAPI Documentation: https://quizapi.io/docs/1.0/overview
- QuizAPI Support: Contact QuizAPI for API-related issues
- Platform Issues: Check the main README for general platform support

## Future Enhancements

Potential improvements for the QuizAPI integration:

- [ ] Support for fill-in-the-blank questions
- [ ] Custom tag mapping
- [ ] Scheduled imports
- [ ] Import from other question APIs
- [ ] Question quality scoring
- [ ] Bulk export/import functionality 