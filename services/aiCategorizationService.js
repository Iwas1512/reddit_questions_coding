const axios = require('axios');

class AICategorizationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Categorize questions using AI (OpenAI or Claude)
   * @param {Array} questions - Array of questions to categorize
   * @param {string} provider - 'openai' or 'claude'
   * @returns {Promise<Object>} Categorized questions grouped by sets
   */
  async categorizeQuestions(questions, provider = 'openai') {
    return this.categorizeQuestionsWithAI(questions, provider);
  }

  /**
   * Categorize questions using AI (OpenAI or Claude)
   * @param {Array} questions - Array of questions to categorize
   * @param {string} provider - 'openai' or 'claude'
   * @returns {Promise<Object>} Categorized questions grouped by sets
   */
  async categorizeQuestionsWithAI(questions, provider = 'openai') {
    if (provider === 'openai') {
      return this.categorizeWithOpenAI(questions);
    } else if (provider === 'claude') {
      return this.categorizeWithClaude(questions);
    } else {
      throw new Error('Unsupported AI provider. Use "openai" or "claude"');
    }
  }

  /**
   * Categorize questions using OpenAI API
   * @param {Array} questions - Array of questions to categorize
   * @returns {Promise<Object>} Categorized questions grouped by sets
   */
  async categorizeWithOpenAI(questions) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = this.buildCategorizationPrompt(questions);
    
    try {
      const requestPayload = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at categorizing programming and technical questions into logical problem sets. You will receive questions and categorize them into meaningful groups.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      };
      console.log('Sending request to OpenAI:', JSON.stringify(requestPayload, null, 2));
      const response = await axios.post('https://api.openai.com/v1/chat/completions', requestPayload, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const result = response.data.choices[0].message.content;
      return this.parseAICategorizationResult(result, questions);
    } catch (error) {
      if (error.response) {
        console.error('OpenAI API error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else {
        console.error('OpenAI API error:', error.message);
      }
      throw new Error(`OpenAI categorization failed: ${error.message}`);
    }
  }

  /**
   * Categorize questions using Claude API
   * @param {Array} questions - Array of questions to categorize
   * @returns {Promise<Object>} Categorized questions grouped by sets
   */
  async categorizeWithClaude(questions) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    const prompt = this.buildCategorizationPrompt(questions);
    
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      const result = response.data.content[0].text;
      return this.parseAICategorizationResult(result, questions);
    } catch (error) {
      console.error('Claude API error:', error.response?.data || error.message);
      throw new Error(`Claude categorization failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt for AI categorization
   * @param {Array} questions - Array of questions
   * @returns {string} Formatted prompt
   */
  buildCategorizationPrompt(questions) {
    const questionsText = questions.map((q, index) => 
      `${index + 1}. ${q.title || q.question}\n   Tags: ${q.tags?.join(', ') || 'none'}\n   Difficulty: ${q.difficulty || 'medium'}`
    ).join('\n\n');

    return `Please categorize the following programming/technical questions into logical problem sets. 

For each category, provide:
- A descriptive title
- A brief description
- The difficulty level (Beginner/Intermediate/Advanced)
- The question numbers that belong to this category

Questions to categorize:
${questionsText}

Please respond in this exact JSON format:
{
  "categories": [
    {
      "title": "Category Title",
      "description": "Category description",
      "difficulty": "Beginner/Intermediate/Advanced",
      "questionNumbers": [1, 3, 5],
      "suggestedTags": ["tag1", "tag2"]
    }
  ]
}

Focus on creating meaningful, focused problem sets that would help someone learn a specific topic or skill.`;
  }

  /**
   * Parse AI categorization result
   * @param {string} result - AI response
   * @param {Array} questions - Original questions
   * @returns {Object} Categorized questions
   */
  parseAICategorizationResult(result, questions) {
    try {
      // Extract JSON from the response (AI might add extra text)
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const categories = {};

      parsed.categories.forEach(category => {
        const categoryKey = this.sanitizeCategoryName(category.title);
        
        categories[categoryKey] = {
          title: category.title,
          description: category.description,
          difficulty: category.difficulty,
          questions: category.questionNumbers.map(num => questions[num - 1]).filter(Boolean),
          suggestedTags: category.suggestedTags || []
        };
      });

      return categories;
    } catch (error) {
      console.error('Error parsing AI categorization result:', error);
      throw new Error(`Failed to parse AI categorization: ${error.message}`);
    }
  }

  /**
   * Sanitize category name for use as object key
   * @param {string} name - Category name
   * @returns {string} Sanitized name
   */
  sanitizeCategoryName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Suggest problem set name and description for a group of questions
   * @param {Array} questions - Array of questions
   * @param {string} provider - 'openai' or 'claude'
   * @returns {Promise<Object>} Suggested title and description
   */
  async suggestProblemSetDetails(questions, provider = 'openai') {
    const questionTitles = questions.map(q => q.title || q.question).join('\n');
    
    const prompt = `Based on these questions, suggest a good problem set title and description:

${questionTitles}

Respond in JSON format:
{
  "title": "Suggested Problem Set Title",
  "description": "A clear, concise description of what this problem set covers",
  "difficulty": "Beginner/Intermediate/Advanced",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    if (provider === 'openai') {
      return this.getOpenAISuggestion(prompt);
    } else if (provider === 'claude') {
      return this.getClaudeSuggestion(prompt);
    }
  }

  /**
   * Get suggestion from OpenAI
   * @param {string} prompt - The prompt
   * @returns {Promise<Object>} Suggestion
   */
  async getOpenAISuggestion(prompt) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating educational problem sets for programming and technical topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0].message.content;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Untitled Set', description: 'No description available' };
    } catch (error) {
      console.error('OpenAI suggestion error:', error);
      return { title: 'Untitled Set', description: 'Error generating suggestion' };
    }
  }

  /**
   * Get suggestion from Claude
   * @param {string} prompt - The prompt
   * @returns {Promise<Object>} Suggestion
   */
  async getClaudeSuggestion(prompt) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });

      const result = response.data.content[0].text;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Untitled Set', description: 'No description available' };
    } catch (error) {
      console.error('Claude suggestion error:', error);
      return { title: 'Untitled Set', description: 'Error generating suggestion' };
    }
  }

  /**
   * Check if AI services are available
   * @returns {Object} Availability status
   */
  checkAvailability() {
    return {
      openai: !!this.openaiApiKey,
      claude: !!this.anthropicApiKey,
      available: !!(this.openaiApiKey || this.anthropicApiKey)
    };
  }
}

module.exports = new AICategorizationService(); 