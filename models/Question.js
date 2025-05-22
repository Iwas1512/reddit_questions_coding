const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Question = sequelize.define('Question', {
  question_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  question_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['mcq', 'fill_in_blank']]
    }
  },
  difficulty_level: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['easy', 'medium', 'hard']]
    }
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  upvote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downvote_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  report_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Question;

//note for Robert- This is  based on reddit downvote system stuff and upvoting, I figured each question should have that, we can also add the verified feature later.