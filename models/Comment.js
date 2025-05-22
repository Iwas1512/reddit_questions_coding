const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Comment = sequelize.define('Comment', {
  comment_id: {
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
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL'
  },
  parent_comment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'comments',
      key: 'comment_id'
    },
    onDelete: 'CASCADE'
  },
  comment_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  upvote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downvote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Comment;
