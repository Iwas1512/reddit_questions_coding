const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Tag = sequelize.define('Tag', {
  tag_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tag_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color_code: {
    type: DataTypes.STRING(7),
    allowNull: true
  }
}, {
  tableName: 'tags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Tag;