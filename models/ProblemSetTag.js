const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProblemSetTag = sequelize.define('ProblemSetTag', {
  problemset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'problemsets',
      key: 'problemset_id'
    },
    onDelete: 'CASCADE'
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tags',
      key: 'tag_id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'problemset_tags',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['problemset_id', 'tag_id']
    }
  ]
});

module.exports = ProblemSetTag; 