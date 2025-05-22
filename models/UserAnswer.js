const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const UserAnswer = sequelize.define('UserAnswer', {
  attempt_id: {
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
  submitted_answer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  time_taken: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'user_answers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UserAnswer;