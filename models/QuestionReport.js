const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const QuestionReport = sequelize.define('QuestionReport', {
  report_id: {
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
  reporter_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL'
  },
  report_reason: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  report_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'reviewed', 'resolved', 'dismissed']]
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'question_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = QuestionReport;