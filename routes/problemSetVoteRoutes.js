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
    
    console.log('Processing vote:', { problemsetId, userId, voteType });
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid vote type' });
    }
    
    // Check if problem set exists
    const problemSet = await ProblemSet.findByPk(problemsetId, { transaction });
    if (!problemSet) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    // Check if user exists
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow users to vote on their own problem sets
    if (problemSet.author_id === parseInt(userId)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Cannot vote on your own problem set' });
    }
    
    // Check if user has already voted
    const existingVote = await ProblemSetVote.findOne({
      where: { user_id: userId, problemset_id: problemsetId },
      transaction
    });
    
    let reputationChange = 0;
    let userVote = null;
    
    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove the vote if same type (toggle off)
        await existingVote.destroy({ transaction });
        reputationChange = voteType === 'upvote' ? -1 : 1;
        userVote = null;
      } else {
        // Change vote type
        await existingVote.update({ vote_type: voteType }, { transaction });
        reputationChange = voteType === 'upvote' ? 2 : -2;
        userVote = voteType;
      }
    } else {
      // Create new vote
      await ProblemSetVote.create({
        user_id: userId,
        problemset_id: problemsetId,
        vote_type: voteType
      }, { transaction });
      reputationChange = voteType === 'upvote' ? 1 : -1;
      userVote = voteType;
    }
    
    console.log('Reputation change:', reputationChange);
    
    // Update author's reputation if there's a change
    if (reputationChange !== 0 && problemSet.author_id) {
      const author = await User.findByPk(problemSet.author_id, { transaction });
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
          points_earned: reputationChange,
          reason: 'question_upvoted', // Using existing enum - represents content upvoted
          reference_id: problemsetId,
          reference_type: 'question' // Using existing enum - will represent problemset
        }, { transaction });
        
        console.log('Updated author reputation:', { 
          authorId: author.user_id, 
          oldRep: author.reputation_score - reputationChange, 
          newRep: newReputation 
        });
      }
    }
    
    await transaction.commit();
    
    // Calculate vote counts directly from database
    const upvoteCount = await ProblemSetVote.count({
      where: { problemset_id: problemsetId, vote_type: 'upvote' }
    });
    
    const downvoteCount = await ProblemSetVote.count({
      where: { problemset_id: problemsetId, vote_type: 'downvote' }
    });
    
    // Update problem set vote counts
    await problemSet.update({
      upvote_count: upvoteCount,
      downvote_count: downvoteCount
    });
    
    console.log('Vote counts updated:', { upvoteCount, downvoteCount });
    
    res.json({
      success: true,
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      user_vote: userVote
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error voting on problem set:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      problemsetId: req.params.problemsetId,
      body: req.body
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