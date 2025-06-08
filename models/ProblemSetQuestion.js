const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProblemSetQuestion = sequelize.define('ProblemSetQuestion', {
  problemset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'problemsets',
      key: 'problemset_id'
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
  question_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'problemset_questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['problemset_id', 'question_id']
    }
  ]
});

module.exports = ProblemSetQuestion; 