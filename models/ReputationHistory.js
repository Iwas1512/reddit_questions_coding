const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ReputationHistory = sequelize.define('ReputationHistory', {
  history_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
  points_earned: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.ENUM('question_answered', 'question_upvoted', 'voucher_earned'),
    allowNull: false
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reference_type: {
    type: DataTypes.ENUM('question', 'answer', 'voucher'),
    allowNull: true
  }
}, {
  tableName: 'reputation_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = ReputationHistory; 