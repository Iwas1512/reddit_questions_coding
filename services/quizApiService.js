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

  /**
   * Get predefined problem sets/categories with their configurations
   * @returns {Array} Array of problem set configurations
   */
  getPredefinedSets() {
    return [
      {
        id: 'linux-basics',
        title: 'Linux Basics',
        description: 'Fundamental Linux commands and concepts',
        category: 'Linux',
        difficulty: 'Easy',
        questionCount: 20,
        tags: ['linux', 'commands', 'basics']
      },
      {
        id: 'linux-advanced',
        title: 'Linux Advanced',
        description: 'Advanced Linux administration and scripting',
        category: 'Linux',
        difficulty: 'Hard',
        questionCount: 15,
        tags: ['linux', 'administration', 'scripting']
      },
      {
        id: 'docker-fundamentals',
        title: 'Docker Fundamentals',
        description: 'Docker containers, images, and basic operations',
        category: 'Docker',
        difficulty: 'Medium',
        questionCount: 20,
        tags: ['docker', 'containers', 'images']
      },
      {
        id: 'kubernetes-basics',
        title: 'Kubernetes Basics',
        description: 'Introduction to Kubernetes orchestration',
        category: 'Kubernetes',
        difficulty: 'Medium',
        questionCount: 15,
        tags: ['kubernetes', 'orchestration', 'pods']
      },
      {
        id: 'javascript-fundamentals',
        title: 'JavaScript Fundamentals',
        description: 'Core JavaScript concepts and syntax',
        category: 'JavaScript',
        difficulty: 'Easy',
        questionCount: 25,
        tags: ['javascript', 'es6', 'fundamentals']
      },
      {
        id: 'python-basics',
        title: 'Python Basics',
        description: 'Python programming fundamentals',
        category: 'Python',
        difficulty: 'Easy',
        questionCount: 20,
        tags: ['python', 'basics', 'syntax']
      },
      {
        id: 'sql-fundamentals',
        title: 'SQL Fundamentals',
        description: 'Basic SQL queries and database concepts',
        category: 'SQL',
        difficulty: 'Medium',
        questionCount: 20,
        tags: ['sql', 'database', 'queries']
      },
      {
        id: 'devops-practices',
        title: 'DevOps Practices',
        description: 'DevOps methodologies and tools',
        category: 'DevOps',
        difficulty: 'Medium',
        questionCount: 15,
        tags: ['devops', 'ci-cd', 'automation']
      },
      {
        id: 'networking-basics',
        title: 'Networking Basics',
        description: 'Computer networking fundamentals',
        category: 'Networking',
        difficulty: 'Medium',
        questionCount: 20,
        tags: ['networking', 'tcp-ip', 'protocols']
      },
      {
        id: 'cloud-computing',
        title: 'Cloud Computing',
        description: 'Cloud platforms and services',
        category: 'Cloud',
        difficulty: 'Medium',
        questionCount: 15,
        tags: ['cloud', 'aws', 'azure', 'gcp']
      }
    ];
  }

  /**
   * Auto-categorize questions into logical sets based on content
   * @param {Array} questions - Array of questions to categorize
   * @returns {Object} Categorized questions grouped by sets
   */
  autoCategorizeQuestions(questions) {
    const categories = {};
    
    questions.forEach(question => {
      const questionData = this.convertQuestionFormat(question, 1); // authorId will be set later
      
      // Determine the best category based on tags and content
      let bestCategory = this.determineBestCategory(questionData.tags, questionData.title);
      
      if (!categories[bestCategory]) {
        categories[bestCategory] = {
          title: this.getCategoryTitle(bestCategory),
          description: this.getCategoryDescription(bestCategory),
          questions: [],
          difficulty: this.getCategoryDifficulty(questionData.difficulty_level),
          tags: questionData.tags
        };
      }
      
      categories[bestCategory].questions.push(questionData);
    });
    
    return categories;
  }

  /**
   * Determine the best category for a question based on tags and title
   * @param {Array} tags - Question tags
   * @param {string} title - Question title
   * @returns {string} Best category name
   */
  determineBestCategory(tags, title) {
    const text = `${title} ${tags.join(' ')}`.toLowerCase();
    
    // Define category keywords
    const categoryKeywords = {
      'linux': ['linux', 'ubuntu', 'centos', 'debian', 'bash', 'shell', 'terminal'],
      'docker': ['docker', 'container', 'image', 'dockerfile'],
      'kubernetes': ['kubernetes', 'k8s', 'pod', 'deployment', 'service'],
      'javascript': ['javascript', 'js', 'node', 'es6', 'react', 'vue'],
      'python': ['python', 'django', 'flask', 'pip'],
      'sql': ['sql', 'mysql', 'postgresql', 'database', 'query'],
      'devops': ['devops', 'ci-cd', 'jenkins', 'gitlab', 'github actions'],
      'networking': ['network', 'tcp', 'ip', 'dns', 'http', 'https'],
      'cloud': ['aws', 'azure', 'gcp', 'cloud', 'ec2', 's3'],
      'programming': ['programming', 'code', 'algorithm', 'data structure']
    };
    
    // Find the category with the most matching keywords
    let bestCategory = 'programming'; // default
    let maxMatches = 0;
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    });
    
    return bestCategory;
  }

  /**
   * Get category title
   * @param {string} category - Category name
   * @returns {string} Category title
   */
  getCategoryTitle(category) {
    const titles = {
      'linux': 'Linux & System Administration',
      'docker': 'Docker & Containers',
      'kubernetes': 'Kubernetes & Orchestration',
      'javascript': 'JavaScript & Frontend',
      'python': 'Python Programming',
      'sql': 'SQL & Databases',
      'devops': 'DevOps & CI/CD',
      'networking': 'Networking & Protocols',
      'cloud': 'Cloud Computing',
      'programming': 'General Programming'
    };
    return titles[category] || 'General Programming';
  }

  /**
   * Get category description
   * @param {string} category - Category name
   * @returns {string} Category description
   */
  getCategoryDescription(category) {
    const descriptions = {
      'linux': 'Linux commands, system administration, and shell scripting',
      'docker': 'Docker containers, images, and containerization concepts',
      'kubernetes': 'Kubernetes orchestration, pods, services, and deployments',
      'javascript': 'JavaScript fundamentals, ES6, and frontend development',
      'python': 'Python programming, frameworks, and best practices',
      'sql': 'SQL queries, database design, and data management',
      'devops': 'DevOps practices, CI/CD pipelines, and automation',
      'networking': 'Computer networking, protocols, and infrastructure',
      'cloud': 'Cloud platforms, services, and deployment strategies',
      'programming': 'General programming concepts and problem solving'
    };
    return descriptions[category] || 'General programming and computer science concepts';
  }

  /**
   * Get category difficulty
   * @param {string} difficulty - Question difficulty
   * @returns {string} Category difficulty
   */
  getCategoryDifficulty(difficulty) {
    const difficultyMap = {
      'easy': 'Beginner',
      'medium': 'Intermediate', 
      'hard': 'Advanced'
    };
    return difficultyMap[difficulty] || 'Intermediate';
  }
}

module.exports = new QuizApiService(); 