const User = require('../models/User');
const ReputationHistory = require('../models/ReputationHistory');
const { Transaction } = require('sequelize');
const sequelize = require('../db');

const VOUCHER_MILESTONE = 20;

class ReputationService {
  static async addReputationPoints(userId, points, reason, referenceId = null, referenceType = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('User not found');
      }

      const oldReputation = user.reputation_score;
      const newReputation = oldReputation + points;
      
      await user.update({ reputation_score: newReputation }, { transaction });

      await ReputationHistory.create({
        user_id: userId,
        points_earned: points,
        reason: reason,
        reference_id: referenceId,
        reference_type: referenceType
      }, { transaction });

      const oldVoucherCount = Math.floor(oldReputation / VOUCHER_MILESTONE);
      const newVoucherCount = Math.floor(newReputation / VOUCHER_MILESTONE);
      
      if (newVoucherCount > oldVoucherCount) {
        const vouchersToAdd = newVoucherCount - oldVoucherCount;
        await user.update({ 
          question_vouchers: user.question_vouchers + vouchersToAdd 
        }, { transaction });

        await ReputationHistory.create({
          user_id: userId,
          points_earned: 0,
          reason: 'voucher_earned',
          reference_id: vouchersToAdd,
          reference_type: 'voucher'
        }, { transaction });
      }

      await transaction.commit();
      
      return {
        newReputation,
        vouchersEarned: newVoucherCount - oldVoucherCount,
        currentVouchers: user.question_vouchers + (newVoucherCount - oldVoucherCount)
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async awardQuestionAnswered(userId, questionId) {
    return await this.addReputationPoints(
      userId, 
      1, 
      'question_answered', 
      questionId, 
      'question'
    );
  }

  static async awardQuestionUpvoted(userId, questionId) {
    return await this.addReputationPoints(
      userId, 
      1, 
      'question_upvoted', 
      questionId, 
      'question'
    );
  }

  static async useQuestionVoucher(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.question_vouchers <= 0) {
      throw new Error('No question vouchers available');
    }

    await user.update({ question_vouchers: user.question_vouchers - 1 });
    return user.question_vouchers - 1;
  }

  static async getUserReputation(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['reputation_score', 'question_vouchers']
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      reputation_score: user.reputation_score,
      question_vouchers: user.question_vouchers,
      next_voucher_at: Math.ceil(user.reputation_score / VOUCHER_MILESTONE) * VOUCHER_MILESTONE,
      points_to_next_voucher: Math.ceil(user.reputation_score / VOUCHER_MILESTONE) * VOUCHER_MILESTONE - user.reputation_score
    };
  }

  static async getReputationHistory(userId, limit = 50) {
    return await ReputationHistory.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: limit
    });
  }
}

module.exports = ReputationService; 