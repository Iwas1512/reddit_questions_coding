const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProblemSetVote = sequelize.define('ProblemSetVote', {
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
  problemset_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'problemsets',
      key: 'problemset_id'
    },
    onDelete: 'CASCADE'
  },
  vote_type: {
    type: DataTypes.ENUM('upvote', 'downvote'),
    allowNull: false
  }
}, {
  tableName: 'problemset_votes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'problemset_id']
    }
  ]
});

module.exports = ProblemSetVote; 