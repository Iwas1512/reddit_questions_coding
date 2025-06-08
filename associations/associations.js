const User = require('../models/User');
const Tag = require('../models/Tag');
const Question = require('../models/Question');
const McqOption = require('../models/McqOption');
const FillBlankAnswer = require('../models/FillBlankAnswer');
const QuestionTag = require('../models/QuestionTag');
const Comment = require('../models/Comment');
const UserAnswer = require('../models/UserAnswer');
const QuestionReport = require('../models/QuestionReport');
const CommentVote = require('../models/CommentVote');
const QuestionVote = require('../models/QuestionVote');
const ReputationHistory = require('../models/ReputationHistory');
const ProblemSet = require('../models/ProblemSet');
const ProblemSetQuestion = require('../models/ProblemSetQuestion');
const ProblemSetVote = require('../models/ProblemSetVote');
const ProblemSetTag = require('../models/ProblemSetTag');

//model associations
User.hasMany(Question, { foreignKey: 'author_id', as: 'questions' });
User.hasMany(Comment, { foreignKey: 'author_id', as: 'comments' });
User.hasMany(UserAnswer, { foreignKey: 'user_id' });
User.hasMany(QuestionReport, { foreignKey: 'reporter_id', as: 'reports' });
User.hasMany(CommentVote, { foreignKey: 'user_id', as: 'commentVotes' });
User.hasMany(QuestionVote, { foreignKey: 'user_id', as: 'questionVotes' });
User.hasMany(ReputationHistory, { foreignKey: 'user_id', as: 'reputationHistory' });
User.hasMany(ProblemSet, { foreignKey: 'author_id', as: 'problemSets' });
User.hasMany(ProblemSetVote, { foreignKey: 'user_id', as: 'problemSetVotes' });

Question.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Question.hasMany(McqOption, { foreignKey: 'question_id', as: 'mcqOptions' });
Question.hasMany(FillBlankAnswer, { foreignKey: 'question_id', as: 'fillBlankAnswers' });
Question.hasMany(Comment, { foreignKey: 'question_id', as: 'comments' });
Question.hasMany(UserAnswer, { foreignKey: 'question_id' });
Question.hasMany(QuestionReport, { foreignKey: 'question_id', as: 'reports' });
Question.hasMany(QuestionVote, { foreignKey: 'question_id', as: 'votes' });

ProblemSet.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
ProblemSet.hasMany(ProblemSetVote, { foreignKey: 'problemset_id', as: 'votes' });

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

ProblemSet.belongsToMany(Question, { 
  through: ProblemSetQuestion, 
  foreignKey: 'problemset_id',
  otherKey: 'question_id',
  as: 'questions'
});
Question.belongsToMany(ProblemSet, { 
  through: ProblemSetQuestion, 
  foreignKey: 'question_id',
  otherKey: 'problemset_id',
  as: 'problemSets'
});

ProblemSet.belongsToMany(Tag, { 
  through: ProblemSetTag, 
  foreignKey: 'problemset_id',
  otherKey: 'tag_id',
  as: 'tags'
});
Tag.belongsToMany(ProblemSet, { 
  through: ProblemSetTag, 
  foreignKey: 'tag_id',
  otherKey: 'problemset_id',
  as: 'problemSets'
});

McqOption.belongsTo(Question, { foreignKey: 'question_id' });

FillBlankAnswer.belongsTo(Question, { foreignKey: 'question_id' });

Comment.belongsTo(Question, { foreignKey: 'question_id' });
Comment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Comment.belongsTo(Comment, { foreignKey: 'parent_comment_id', as: 'parentComment' });
Comment.hasMany(Comment, { foreignKey: 'parent_comment_id', as: 'replies' });
Comment.hasMany(CommentVote, { foreignKey: 'comment_id', as: 'votes' });

UserAnswer.belongsTo(User, { foreignKey: 'user_id' });
UserAnswer.belongsTo(Question, { foreignKey: 'question_id' });

QuestionReport.belongsTo(Question, { foreignKey: 'question_id' });
QuestionReport.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

CommentVote.belongsTo(User, { foreignKey: 'user_id' });
CommentVote.belongsTo(Comment, { foreignKey: 'comment_id' });

QuestionVote.belongsTo(User, { foreignKey: 'user_id' });
QuestionVote.belongsTo(Question, { foreignKey: 'question_id' });

ProblemSetVote.belongsTo(User, { foreignKey: 'user_id' });
ProblemSetVote.belongsTo(ProblemSet, { foreignKey: 'problemset_id' });

ReputationHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Tag,
  Question,
  McqOption,
  FillBlankAnswer,
  QuestionTag,
  Comment,
  UserAnswer,
  QuestionReport,
  CommentVote,
  QuestionVote,
  ReputationHistory,
  ProblemSet,
  ProblemSetQuestion,
  ProblemSetVote,
  ProblemSetTag
};