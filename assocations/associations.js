const User = require('../models/User');
const Tag = require('../models/Tag');
const Question = require('../models/Question');
const McqOption = require('../models/McqOption');
const FillBlankAnswer = require('../models/FillBlankAnswer');
const QuestionTag = require('../models/QuestionTag');
const QuestionVote = require('../models/QuestionVote');
const Comment = require('../models/Comment');
const CommentVote = require('../models/CommentVote');
const UserAnswer = require('../models/UserAnswer');
const QuestionReport = require('../models/QuestionReport');

//model assocations
User.hasMany(Question, { foreignKey: 'author_id', as: 'questions' });
User.hasMany(QuestionVote, { foreignKey: 'user_id' });
User.hasMany(Comment, { foreignKey: 'author_id', as: 'comments' });
User.hasMany(CommentVote, { foreignKey: 'user_id' });
User.hasMany(UserAnswer, { foreignKey: 'user_id' });
User.hasMany(QuestionReport, { foreignKey: 'reporter_id', as: 'reports' });

Question.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Question.hasMany(McqOption, { foreignKey: 'question_id', as: 'mcqOptions' });
Question.hasMany(FillBlankAnswer, { foreignKey: 'question_id', as: 'fillBlankAnswers' });
Question.hasMany(QuestionVote, { foreignKey: 'question_id' });
Question.hasMany(Comment, { foreignKey: 'question_id', as: 'comments' });
Question.hasMany(UserAnswer, { foreignKey: 'question_id' });
Question.hasMany(QuestionReport, { foreignKey: 'question_id', as: 'reports' });

//many to many associations
Question.belongsToMany(Tag, { 
  through: QuestionTag, 
  foreignKey: 'question_id',
  otherKey: 'tag_id',
  as: 'tags'
});
Tag.belongsToMany(Question, { 
  through: QuestionTag, 
  foreignKey: 'tag_id',
  otherKey: 'question_id',
  as: 'questions'
});

McqOption.belongsTo(Question, { foreignKey: 'question_id' });

FillBlankAnswer.belongsTo(Question, { foreignKey: 'question_id' });

QuestionVote.belongsTo(User, { foreignKey: 'user_id' });
QuestionVote.belongsTo(Question, { foreignKey: 'question_id' });

CommentVote.belongsTo(User, { foreignKey: 'user_id' });
CommentVote.belongsTo(Comment, { foreignKey: 'comment_id' });

Comment.belongsTo(Question, { foreignKey: 'question_id' });
Comment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Comment.belongsTo(Comment, { foreignKey: 'parent_comment_id', as: 'parentComment' });
Comment.hasMany(Comment, { foreignKey: 'parent_comment_id', as: 'replies' });
Comment.hasMany(CommentVote, { foreignKey: 'comment_id' });

UserAnswer.belongsTo(User, { foreignKey: 'user_id' });
UserAnswer.belongsTo(Question, { foreignKey: 'question_id' });

QuestionReport.belongsTo(Question, { foreignKey: 'question_id' });
QuestionReport.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

module.exports = {
  User,
  Tag,
  Question,
  McqOption,
  FillBlankAnswer,
  QuestionTag,
  QuestionVote,
  Comment,
  CommentVote,
  UserAnswer,
  QuestionReport
};