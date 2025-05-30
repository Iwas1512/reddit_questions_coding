const express = require('express');
const router = express.Router();
const { Comment, CommentVote, User } = require('../associations/associations.js');

// Vote on a comment
router.post('/:commentId/vote', async (req, res) => {
  const transaction = await Comment.sequelize.transaction();
  
  try {
    const { commentId } = req.params;
    const { userId, voteType } = req.body;

    // Validate vote type
    if (!['upvote', 'downvote'].includes(voteType)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid vote type. Must be either "upvote" or "downvote"' });
    }

    // Check if comment exists
    const comment = await Comment.findByPk(commentId, { transaction });
    if (!comment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user exists
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for existing vote
    let existingVote = await CommentVote.findOne({
      where: {
        comment_id: commentId,
        user_id: userId
      },
      transaction
    });

    if (existingVote) {
      // If same vote type, remove the vote
      if (existingVote.vote_type === voteType) {
        await existingVote.destroy({ transaction });
        
        // Update comment vote counts
        if (voteType === 'upvote') {
          comment.upvote_count = Math.max(0, comment.upvote_count - 1);
        } else {
          comment.downvote_count = Math.max(0, comment.downvote_count - 1);
        }
      } else {
        // If different vote type, update the vote
        existingVote.vote_type = voteType;
        await existingVote.save({ transaction });
        
        // Update comment vote counts
        if (voteType === 'upvote') {
          comment.upvote_count += 1;
          comment.downvote_count = Math.max(0, comment.downvote_count - 1);
        } else {
          comment.downvote_count += 1;
          comment.upvote_count = Math.max(0, comment.upvote_count - 1);
        }
      }
    } else {
      // Create new vote
      await CommentVote.create({
        comment_id: commentId,
        user_id: userId,
        vote_type: voteType
      }, { transaction });
      
      // Update comment vote counts
      if (voteType === 'upvote') {
        comment.upvote_count += 1;
      } else {
        comment.downvote_count += 1;
      }
    }

    await comment.save({ transaction });
    await transaction.commit();

    // Get updated vote counts and user's vote status
    const updatedComment = await Comment.findByPk(commentId, {
      include: [
        {
          model: CommentVote,
          as: 'votes',
          where: { user_id: userId },
          required: false
        }
      ]
    });

    res.json({
      comment: updatedComment,
      userVote: updatedComment.votes[0]?.vote_type || null
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

// Get comment votes
router.get('/:commentId/votes', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.query;

    const comment = await Comment.findByPk(commentId, {
      include: [
        {
          model: CommentVote,
          as: 'votes',
          where: userId ? { user_id: userId } : {},
          required: false
        }
      ]
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({
      comment,
      userVote: comment.votes[0]?.vote_type || null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new comment on a question
router.post('/', async (req, res) => {
  try {
    const { questionId, authorId, commentText, parentCommentId } = req.body;
    if (!questionId || !authorId || !commentText) {
      return res.status(400).json({ error: 'questionId, authorId, and commentText are required.' });
    }
    const newComment = await Comment.create({
      question_id: questionId,
      author_id: authorId,
      comment_text: commentText,
      parent_comment_id: parentCommentId || null
    });
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all comments for a question
router.get('/', async (req, res) => {
  try {
    const { questionId } = req.query;
    if (!questionId) {
      return res.status(400).json({ error: 'questionId query parameter is required.' });
    }
    const comments = await Comment.findAll({
      where: { question_id: questionId, is_active: true },
      order: [['created_at', 'ASC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['user_id', 'username', 'first_name', 'last_name']
        }
      ]
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a comment
router.put('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;
    const comment = await Comment.findByPk(commentId);
    if (!comment || !comment.is_active) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    comment.comment_text = commentText;
    comment.is_edited = true;
    await comment.save();
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment (soft delete)
router.delete('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findByPk(commentId);
    if (!comment || !comment.is_active) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    comment.is_active = false;
    await comment.save();
    res.json({ message: 'Comment deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 