const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const CommentVote = sequelize.define('CommentVote', {
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
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'comments',
      key: 'comment_id'
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
  tableName: 'comment_votes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'comment_id']
    }
  ]
});

module.exports = CommentVote;