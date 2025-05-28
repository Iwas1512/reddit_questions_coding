const express = require('express');
const router = express.Router();
const { Question, QuestionVote, User } = require('../associations/associations.js');

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

module.exports = router; 