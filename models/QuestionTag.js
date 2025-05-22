const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const QuestionTag = sequelize.define('QuestionTag', {
  question_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'questions',
      key: 'question_id'
    },
    onDelete: 'CASCADE'
  },
  tag_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'tags',
      key: 'tag_id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'question_tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = QuestionTag;