const express = require('express');
const router = express.Router();
const { Question, QuestionVote, User, UserAnswer, McqOption } = require('../associations/associations.js');

// Vote on a question
router.post('/:questionId/vote', async (req, res) => {
  const transaction = await Question.sequelize.transaction();
  
  try {
    const { questionId } = req.params;
    const { userId, voteType } = req.body;

    // Validate vote type
    if (!['upvote', 'downvote'].includes(voteType)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid vote type. Must be either "upvote" or "downvote"' });
    }

    // Check if question exists
    const question = await Question.findByPk(questionId);
    if (!question) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for existing vote
    let existingVote = await QuestionVote.findOne({
      where: {
        question_id: questionId,
        user_id: userId
      }
    });

    if (existingVote) {
      // If same vote type, remove the vote
      if (existingVote.vote_type === voteType) {
        await existingVote.destroy({ transaction });
        
        // Update question vote counts
        if (voteType === 'upvote') {
          question.upvote_count = Math.max(0, question.upvote_count - 1);
        } else {
          question.downvote_count = Math.max(0, question.downvote_count - 1);
        }
      } else {
        // If different vote type, update the vote
        existingVote.vote_type = voteType;
        await existingVote.save({ transaction });
        
        // Update question vote counts
        if (voteType === 'upvote') {
          question.upvote_count += 1;
          question.downvote_count = Math.max(0, question.downvote_count - 1);
        } else {
          question.downvote_count += 1;
          question.upvote_count = Math.max(0, question.upvote_count - 1);
        }
      }
    } else {
      // Create new vote
      await QuestionVote.create({
        question_id: questionId,
        user_id: userId,
        vote_type: voteType
      }, { transaction });
      
      // Update question vote counts
      if (voteType === 'upvote') {
        question.upvote_count += 1;
      } else {
        question.downvote_count += 1;
      }
    }

    await question.save({ transaction });
    await transaction.commit();

    // Get updated vote counts and user's vote status
    const updatedQuestion = await Question.findByPk(questionId, {
      include: [
        {
          model: QuestionVote,
          as: 'votes',
          where: { user_id: userId },
          required: false
        }
      ]
    });

    res.json({
      question: updatedQuestion,
      userVote: updatedQuestion.votes[0]?.vote_type || null
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

// Get question votes
router.get('/:questionId/votes', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { userId } = req.query;

    const question = await Question.findByPk(questionId, {
      include: [
        {
          model: QuestionVote,
          as: 'votes',
          where: userId ? { user_id: userId } : {},
          required: false
        }
      ]
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      question,
      userVote: question.votes[0]?.vote_type || null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user votes for all questions (bulk)
router.get('/user/:userId/votes', async (req, res) => {
  try {
    const { userId } = req.params;

    const userVotes = await QuestionVote.findAll({
      where: { user_id: userId },
      attributes: ['question_id', 'vote_type']
    });

    // Convert to a map for easy lookup
    const votesMap = {};
    userVotes.forEach(vote => {
      votesMap[vote.question_id] = vote.vote_type;
    });

    res.json(votesMap);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user answers for all questions (bulk)
router.get('/user/:userId/answers', async (req, res) => {
  try {
    const { userId } = req.params;

    const userAnswers = await UserAnswer.findAll({
      where: { user_id: userId },
      attributes: ['question_id', 'is_correct', 'submitted_answer', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    // Convert to a map for easy lookup - only keep the latest answer per question
    const answersMap = {};
    userAnswers.forEach(answer => {
      if (!answersMap[answer.question_id]) {
        answersMap[answer.question_id] = {
          is_correct: answer.is_correct,
          submitted_answer: answer.submitted_answer,
          answered_at: answer.created_at
        };
      }
    });

    res.json(answersMap);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user answer for a specific question
router.get('/:questionId/user/:userId/answer', async (req, res) => {
  try {
    const { questionId, userId } = req.params;

    const userAnswer = await UserAnswer.findOne({
      where: { 
        user_id: userId, 
        question_id: questionId 
      },
      order: [['created_at', 'DESC']] // Get the latest answer
    });

    if (!userAnswer) {
      return res.status(404).json({ error: 'User answer not found' });
    }

    // Get the question to determine the type
    const question = await Question.findByPk(questionId);
    let userAnswerText = userAnswer.submitted_answer; // Default to submitted answer

    if (question && question.question_type === 'mcq') {
      // For MCQ, convert option ID to option text
      const selectedOption = await McqOption.findByPk(userAnswer.submitted_answer);
      userAnswerText = selectedOption ? selectedOption.option_text : userAnswer.submitted_answer;
    }

    res.json({
      is_correct: userAnswer.is_correct,
      submitted_answer: userAnswerText, // Return the text representation
      answered_at: userAnswer.created_at
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 