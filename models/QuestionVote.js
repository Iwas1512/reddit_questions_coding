const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const QuestionVote = sequelize.define('QuestionVote', {
  vote_id: {
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
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'questions',
      key: 'question_id'
    },
    onDelete: 'CASCADE'
  },
  vote_type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['upvote', 'downvote']]
    }
  }
}, {
  tableName: 'question_votes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'question_id']
    }
  ]
});

module.exports = QuestionVote;