const express = require('express');
const router = express.Router();
const { ProblemSetVote, ProblemSet, User, ReputationHistory } = require('../associations/associations');
const sequelize = require('../db');

// Vote on a problem set
router.post('/:problemsetId/vote', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { problemsetId } = req.params;
    const { userId, voteType } = req.body;
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid vote type' });
    }
    
    // Check if problem set exists
    const problemSet = await ProblemSet.findByPk(problemsetId);
    if (!problemSet) {
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow users to vote on their own problem sets
    if (problemSet.author_id === parseInt(userId)) {
      return res.status(400).json({ message: 'Cannot vote on your own problem set' });
    }
    
    // Check if user has already voted
    const existingVote = await ProblemSetVote.findOne({
      where: { user_id: userId, problemset_id: problemsetId }
    });
    
    let voteChange = 0;
    let reputationChange = 0;
    
    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove the vote if same type
        await existingVote.destroy({ transaction });
        voteChange = voteType === 'upvote' ? -1 : 1;
        reputationChange = voteType === 'upvote' ? -1 : 1;
      } else {
        // Change vote type
        await existingVote.update({ vote_type: voteType }, { transaction });
        voteChange = voteType === 'upvote' ? 2 : -2;
        reputationChange = voteType === 'upvote' ? 2 : -2;
      }
    } else {
      // Create new vote
      await ProblemSetVote.create({
        user_id: userId,
        problemset_id: problemsetId,
        vote_type: voteType
      }, { transaction });
      voteChange = voteType === 'upvote' ? 1 : -1;
      reputationChange = voteType === 'upvote' ? 1 : -1;
    }
    
    // Update problem set vote counts
    if (voteType === 'upvote') {
      if (voteChange > 0) {
        await problemSet.increment('upvote_count', { 
          by: voteChange,
          transaction 
        });
      } else if (voteChange < 0) {
        await problemSet.decrement('upvote_count', { 
          by: Math.abs(voteChange),
          transaction 
        });
      }
      // Handle vote type change (from downvote to upvote)
      if (existingVote && existingVote.vote_type !== voteType && voteChange === 2) {
        await problemSet.decrement('downvote_count', { 
          by: 1,
          transaction 
        });
      }
    } else {
      if (voteChange < 0) {
        await problemSet.increment('downvote_count', { 
          by: Math.abs(voteChange),
          transaction 
        });
      } else if (voteChange > 0) {
        await problemSet.decrement('downvote_count', { 
          by: voteChange,
          transaction 
        });
      }
      // Handle vote type change (from upvote to downvote)
      if (existingVote && existingVote.vote_type !== voteType && voteChange === -2) {
        await problemSet.decrement('upvote_count', { 
          by: 1,
          transaction 
        });
      }
    }
    
    // Update author's reputation if there's a change
    if (reputationChange !== 0 && problemSet.author_id) {
      const author = await User.findByPk(problemSet.author_id);
      if (author) {
        const newReputation = Math.max(0, author.reputation_score + reputationChange);
        const newVouchers = Math.floor(newReputation / 20);
        
        await author.update({
          reputation_score: newReputation,
          question_vouchers: newVouchers
        }, { transaction });
        
        // Log reputation change
        await ReputationHistory.create({
          user_id: problemSet.author_id,
          change_amount: reputationChange,
          change_reason: `Problem set ${voteType}`,
          related_id: problemsetId,
          related_type: 'problemset_vote'
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Fetch updated problem set
    const updatedProblemSet = await ProblemSet.findByPk(problemsetId);
    
    res.json({
      success: true,
      upvote_count: updatedProblemSet.upvote_count,
      downvote_count: updatedProblemSet.downvote_count,
      user_vote: existingVote && existingVote.vote_type === voteType ? null : voteType
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error voting on problem set:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      problemsetId,
      userId,
      voteType
    });
    res.status(500).json({ 
      message: 'Failed to vote on problem set',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user's votes for problem sets
router.get('/user/:userId/votes', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const votes = await ProblemSetVote.findAll({
      where: { user_id: userId },
      attributes: ['problemset_id', 'vote_type']
    });
    
    const voteMap = {};
    votes.forEach(vote => {
      voteMap[vote.problemset_id] = vote.vote_type;
    });
    
    res.json(voteMap);
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({ message: 'Failed to fetch user votes' });
  }
});

// Get votes for a specific problem set
router.get('/:problemsetId/votes', async (req, res) => {
  try {
    const { problemsetId } = req.params;
    
    const votes = await ProblemSetVote.findAll({
      where: { problemset_id: problemsetId },
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'first_name', 'last_name']
      }]
    });
    
    res.json(votes);
  } catch (error) {
    console.error('Error fetching problem set votes:', error);
    res.status(500).json({ message: 'Failed to fetch problem set votes' });
  }
});

module.exports = router; 