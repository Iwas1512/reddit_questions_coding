const sequelize = require('../db');
const { 
  Question, 
  ProblemSet, 
  McqOption, 
  FillBlankAnswer, 
  ProblemSetQuestion, 
  ProblemSetVote,
  ProblemSetTag,
  UserAnswer,
  QuestionVote,
  Comment,
  CommentVote,
  QuestionReport,
  QuestionTag
} = require('../associations/associations');

async function cleanSampleData() {
  try {
    // Sync database
    await sequelize.sync();
    console.log('Database synced successfully');

    console.log('🧹 Starting database cleanup...');

    // Delete in the correct order to respect foreign key constraints
    
    // 1. Delete junction table records first
    console.log('Deleting problem set associations...');
    await ProblemSetQuestion.destroy({ where: {} });
    
    console.log('Deleting problem set votes...');
    await ProblemSetVote.destroy({ where: {} });
    
    console.log('Deleting problem set tags...');
    await ProblemSetTag.destroy({ where: {} });
    
    console.log('Deleting question votes...');
    await QuestionVote.destroy({ where: {} });
    
    console.log('Deleting user answers...');
    await UserAnswer.destroy({ where: {} });
    
    console.log('Deleting comment votes...');
    await CommentVote.destroy({ where: {} });
    
    console.log('Deleting comments...');
    await Comment.destroy({ where: {} });
    
    console.log('Deleting question reports...');
    await QuestionReport.destroy({ where: {} });
    
    console.log('Deleting question tags...');
    await QuestionTag.destroy({ where: {} });
    
    // 2. Delete MCQ options and fill-in-the-blank answers
    console.log('Deleting MCQ options...');
    await McqOption.destroy({ where: {} });
    
    console.log('Deleting fill-in-the-blank answers...');
    await FillBlankAnswer.destroy({ where: {} });
    
    // 3. Delete questions and problem sets
    console.log('Deleting questions...');
    await Question.destroy({ where: {} });
    
    console.log('Deleting problem sets...');
    await ProblemSet.destroy({ where: {} });

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('All sample data has been removed.');
    console.log('\nYou can now run: npm run generate-sample-data');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  cleanSampleData();
}

module.exports = cleanSampleData; 