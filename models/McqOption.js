const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const McqOption = sequelize.define('McqOption', {
  option_id: {
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
  option_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  option_order: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'mcq_options',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = McqOption;