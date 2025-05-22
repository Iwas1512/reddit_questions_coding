const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const FillBlankAnswer = sequelize.define('FillBlankAnswer', {
  answer_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  correct_answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_case_sensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  accepts_partial_match: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'fill_blank_answers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = FillBlankAnswer;