const axios = require('axios');

class QuizApiService {
  constructor() {
    this.baseURL = 'https://quizapi.io/api/v1';
    this.apiKey = process.env.QUIZAPI_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️ QUIZAPI_KEY environment variable is not set. QuizAPI integration will not work.');
    }
  }

  /**
   * Fetch questions from QuizAPI
   * @param {Object} options - Query parameters
   * @param {number} options.limit - Number of questions to fetch (default: 10)
   * @param {string} options.category - Category filter (e.g., 'Linux', 'DevOps', 'Programming')
   * @param {string} options.difficulty - Difficulty level ('Easy', 'Medium', 'Hard')
   * @param {string} options.tags - Comma-separated tags
   * @returns {Promise<Array>} Array of questions from QuizAPI
   */
  async fetchQuestions(options = {}) {
    if (!this.apiKey) {
      throw new Error('QuizAPI key is not configured');
    }

    try {
      const params = {
        apiKey: this.apiKey,
        limit: options.limit || 10,
        ...options
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });

      console.log('🔍 Fetching questions from QuizAPI with params:', params);

      const response = await axios.get(`${this.baseURL}/questions`, {
        params,
        timeout: 10000
      });

      console.log(`✅ Successfully fetched ${response.data.length} questions from QuizAPI`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching questions from QuizAPI:', error.message);
      if (error.response) {
        console.error('QuizAPI Error Response:', error.response.data);
      }
      throw new Error(`Failed to fetch questions from QuizAPI: ${error.message}`);
    }
  }

  /**
   * Convert QuizAPI question format to your app's format
   * @param {Object} quizApiQuestion - Question from QuizAPI
   * @param {number} authorId - ID of the user importing the question
   * @returns {Object} Question in your app's format
   */
  convertQuestionFormat(quizApiQuestion, authorId) {
    // Extract correct answers
    const correctAnswers = [];
    const answers = quizApiQuestion.answers;
    const correctAnswersObj = quizApiQuestion.correct_answers;

    Object.keys(correctAnswersObj).forEach(key => {
      if (correctAnswersObj[key] === 'true') {
        const answerKey = key.replace('_correct', '');
        if (answers[answerKey]) {
          correctAnswers.push(answers[answerKey]);
        }
      }
    });

    // Create MCQ options
    const mcqOptions = [];
    Object.keys(answers).forEach(key => {
      if (answers[key]) {
        mcqOptions.push({
          option_text: answers[key],
          is_correct: correctAnswersObj[`${key}_correct`] === 'true'
        });
      }
    });

    // Map difficulty levels
    const difficultyMap = {
      'Easy': 'easy',
      'Medium': 'medium',
      'Hard': 'hard'
    };

    // Create tags from category and tags
    const tags = [];
    if (quizApiQuestion.category) {
      tags.push(quizApiQuestion.category.toLowerCase());
    }
    if (quizApiQuestion.tags && Array.isArray(quizApiQuestion.tags)) {
      tags.push(...quizApiQuestion.tags.map(tag => tag.name || tag));
    }

    return {
      title: quizApiQuestion.question,
      question_text: quizApiQuestion.description || quizApiQuestion.question,
      question_type: 'mcq',
      difficulty_level: difficultyMap[quizApiQuestion.difficulty] || 'medium',
      explanation: quizApiQuestion.explanation || '',
      author_id: authorId,
      mcqOptions: mcqOptions,
      tags: tags,
      source: 'quizapi',
      external_id: quizApiQuestion.id
    };
  }

  /**
   * Get available categories from QuizAPI
   * @returns {Promise<Array>} Array of available categories
   */
  async getCategories() {
    // QuizAPI doesn't provide a categories endpoint, so we'll return common ones
    return [
      'Linux',
      'DevOps',
      'Networking',
      'Programming',
      'Cloud',
      'Docker',
      'Kubernetes',
      'PHP',
      'JavaScript',
      'Python',
      'SQL',
      'HTML',
      'CSS'
    ];
  }

  /**
   * Get available difficulty levels
   * @returns {Array} Array of difficulty levels
   */
  getDifficultyLevels() {
    return ['Easy', 'Medium', 'Hard'];
  }
}

module.exports = new QuizApiService(); 