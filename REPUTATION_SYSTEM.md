# Reputation System

## Overview
The reputation system is designed to encourage quality participation and prevent spam by requiring users to earn "vouchers" to create questions.

## How It Works

### Earning Reputation Points
Users earn reputation points through:
- **Correct Answers**: +1 point for each question answered correctly (only first correct answer counts)
- **Question Upvotes**: +1 point for each upvote received on their questions

### Question Vouchers
- **Starting Vouchers**: New users start with 3 question vouchers
- **Earning Vouchers**: Users earn 1 additional voucher for every 20 reputation points
- **Using Vouchers**: Creating a question costs 1 voucher

### Milestone System
- Every 20 points = 1 new voucher
- Progress is tracked and displayed to users
- Vouchers accumulate (no expiration)

## API Endpoints

### Get User Reputation
```
GET /api/reputation/user/:userId
```
Returns:
```json
{
  "reputation_score": 25,
  "question_vouchers": 4,
  "next_voucher_at": 40,
  "points_to_next_voucher": 15
}
```

### Get Reputation History
```
GET /api/reputation/user/:userId/history?limit=50
```
Returns array of reputation changes with timestamps and reasons.

## Database Schema

### Users Table Addition
```sql
ALTER TABLE users ADD COLUMN question_vouchers INTEGER DEFAULT 3;
```

### Reputation History Table
```sql
CREATE TABLE reputation_history (
  history_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  points_earned INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  reference_id INTEGER,
  reference_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend Components

### ReputationDisplay
Shows user's current reputation and progress to next voucher.

### ReputationNotification
Displays notifications when users earn points or vouchers.

## Benefits
1. **Spam Prevention**: Limits question creation for new/low-reputation users
2. **Quality Incentive**: Rewards good answers and well-received questions
3. **Engagement**: Gamifies the learning experience
4. **Progressive Access**: Users gradually earn more privileges 