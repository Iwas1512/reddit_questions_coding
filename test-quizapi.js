require('dotenv').config();
const QuizApiService = require('./services/quizApiService');

async function testQuizApi() {
  console.log('🧪 Testing QuizAPI Integration...\n');

  try {
    // Test 1: Check if API key is configured
    console.log('1. Checking API key configuration...');
    if (!process.env.QUIZAPI_KEY) {
      console.log('❌ QUIZAPI_KEY not found in environment variables');
      console.log('   Please add QUIZAPI_KEY=your-api-key to your .env file');
      return;
    }
    console.log('✅ API key is configured\n');

    // Test 2: Fetch categories
    console.log('2. Fetching available categories...');
    const categories = await QuizApiService.getCategories();
    console.log(`✅ Found ${categories.length} categories:`, categories.join(', '), '\n');

    // Test 3: Fetch sample questions
    console.log('3. Fetching sample questions...');
    const questions = await QuizApiService.fetchQuestions({
      limit: 2,
      category: 'Linux'
    });
    console.log(`✅ Successfully fetched ${questions.length} questions\n`);

    // Test 4: Test question format conversion
    console.log('4. Testing question format conversion...');
    if (questions.length > 0) {
      const convertedQuestion = QuizApiService.convertQuestionFormat(questions[0], 1);
      console.log('✅ Question converted successfully:');
      console.log(`   Title: ${convertedQuestion.title}`);
      console.log(`   Type: ${convertedQuestion.question_type}`);
      console.log(`   Difficulty: ${convertedQuestion.difficulty_level}`);
      console.log(`   Options: ${convertedQuestion.mcqOptions.length} options`);
      console.log(`   Tags: ${convertedQuestion.tags.join(', ')}\n`);
    }

    // Test 5: Test different categories
    console.log('5. Testing different categories...');
    const programmingQuestions = await QuizApiService.fetchQuestions({
      limit: 1,
      category: 'Programming'
    });
    console.log(`✅ Successfully fetched ${programmingQuestions.length} programming questions\n`);

    console.log('🎉 All tests passed! QuizAPI integration is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Start your frontend server: npm run dev');
    console.log('   3. Log in as an admin user');
    console.log('   4. Click the "QUIZAPI" tab to import questions');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
  }
}

// Run the test
testQuizApi(); 