const sequelize = require('../db');
const { Op } = require('sequelize');
const { Question, ProblemSet, McqOption, FillBlankAnswer, ProblemSetQuestion, User, Tag, QuestionTag, ProblemSetTag } = require('../associations/associations');

// === TAGS ===
// List all tags you want to use here. Difficulty tags are handled automatically.
const sampleTags = [
  'javascript', 'python', 'algorithms', 'data structures', 'frontend', 'backend', 
  'interview', 'loops', 'functions', 'arrays', 'objects', 'strings', 'logic'
];

// Pre-defined colors for common tags. Others will get a random color.
const tagColorMap = {
  javascript: '#F7DF1E',
  python: '#3776AB',
  algorithms: '#f44336',
  'data structures': '#4CAF50',
  frontend: '#673AB7',
  backend: '#FF9800',
  interview: '#00BCD4',
  arrays: '#2196F3',
  functions: '#9C27B0'
};

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// === TEMPLATE: Add more questions below ===
// Each question can be MCQ or fill_in_blank. For MCQ, provide mcqOptions. For fill_in_blank, provide fillBlankAnswer.
// Add tagNames: [] to associate tags
const sampleQuestions = [
  // --- JavaScript MCQs ---
  {
    title: "JavaScript Array Methods",
    question_text: "Which JavaScript array method creates a new array with all elements that pass the test implemented by the provided function?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "The filter() method creates a new array with all elements that pass the test implemented by the provided function.",
    code: "const numbers = [1, 2, 3, 4, 5, 6];\nconst evenNumbers = numbers.filter(num => num % 2 === 0);\nconsole.log(evenNumbers); // [2, 4, 6]",
    language: "javascript",
    tagNames: ['javascript', 'arrays', 'frontend'],
    mcqOptions: [
      { option_text: "map()", is_correct: false, option_order: 1 },
      { option_text: "filter()", is_correct: true, option_order: 2 },
      { option_text: "reduce()", is_correct: false, option_order: 3 },
      { option_text: "forEach()", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "JavaScript Closures",
    question_text: "What is the output of the following code snippet?",
    question_type: "mcq",
    difficulty_level: "medium",
    explanation: "This demonstrates a closure in JavaScript. The inner function retains access to its outer scope's variables.",
    code: "function createCounter() {\n  let count = 0;\n  return function() {\n    return ++count;\n  };\n}\nconst counter = createCounter();\nconsole.log(counter());\nconsole.log(counter());",
    language: "javascript",
    tagNames: ['javascript', 'functions', 'logic'],
    mcqOptions: [
      { option_text: "1, 1", is_correct: false, option_order: 1 },
      { option_text: "1, 2", is_correct: true, option_order: 2 },
      { option_text: "0, 1", is_correct: false, option_order: 3 },
      { option_text: "Error", is_correct: false, option_order: 4 }
    ]
  },
  // --- Python MCQs ---
  {
    title: "Python List Slicing",
    question_text: "What does `nums[1:4]` return?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "List slicing `[start:end]` extracts a sublist from the start index up to (but not including) the end index.",
    code: "nums = [10, 20, 30, 40, 50]\nprint(nums[1:4])",
    language: "python",
    tagNames: ['python', 'arrays', 'data structures'],
    mcqOptions: [
      { option_text: "[10, 20, 30]", is_correct: false, option_order: 1 },
      { option_text: "[20, 30, 40]", is_correct: true, option_order: 2 },
      { option_text: "[20, 30, 40, 50]", is_correct: false, option_order: 3 },
      { option_text: "[30, 40, 50]", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "Python Dictionary Access",
    question_text: "How do you safely access a key that might not exist in a dictionary?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "The `.get()` method returns a default value (None, or a specified value) if the key is not found, avoiding a KeyError.",
    code: "d = {'a': 1, 'b': 2}\nprint(d.get('c', 'Not Found'))",
    language: "python",
    tagNames: ['python', 'objects', 'data structures'],
    mcqOptions: [
      { option_text: "d['c']", is_correct: false, option_order: 1 },
      { option_text: "d.get('c')", is_correct: true, option_order: 2 },
      { option_text: "d.find('c')", is_correct: false, option_order: 3 },
      { option_text: "d.c", is_correct: false, option_order: 4 }
    ]
  },
  // --- Fill-in-the-blank (Python) ---
  {
    title: "Python Function Definition",
    question_text: "Complete the Python function definition: ___ def greet(name):",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "In Python, the 'def' keyword is used to define a function.",
    code: "def greet(name):\n    return f\"Hello, {name}!\"\nprint(greet(\"Alice\"))  # Hello, Alice!",
    language: "python",
    tagNames: ['python', 'easy'],
    fillBlankAnswer: {
      correct_answer: "def",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python List Comprehension",
    question_text: "Complete the list comprehension to create a list of squares for even numbers from 1 to 10:\n\nsquares = [x**2 ___ x in range(1, 11) if x % 2 == 0]",
    question_type: "fill_in_blank",
    difficulty_level: "medium",
    explanation: "List comprehensions in Python use the syntax [expression for item in iterable if condition].",
    code: "squares = [x**2 for x in range(1, 11) if x % 2 == 0]\nprint(squares)  # [4, 16, 36, 64, 100]",
    language: "python",
    tagNames: ['python', 'medium'],
    fillBlankAnswer: {
      correct_answer: "for",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  // --- More MCQs and fill-in-the-blanks for diversity ---
  // ... (Add 15 more questions here, mixing languages, types, and difficulties)
];

// --- TEMPLATE: Add more problem sets below ---
// Each problem set should have a title, description, difficulty_level, questionIndices, and tagNames
const sampleProblemSets = [
  {
    title: "JavaScript Fundamentals",
    description: "A collection of basic JavaScript concepts including arrays, functions, and object manipulation.",
    difficulty_level: "easy",
    questionIndices: [0, 1],
    tagNames: ['javascript', 'frontend', 'interview']
  },
  {
    title: "Python Basics",
    description: "Essential Python programming concepts covering syntax, functions, and basic data structures.",
    difficulty_level: "easy",
    questionIndices: [2, 3],
    tagNames: ['python', 'backend', 'data structures']
  },
  {
    title: "Intermediate Coding Mix",
    description: "A mix of intermediate-level coding questions from various languages.",
    difficulty_level: "medium",
    questionIndices: [1, 3, 6, 7, 8],
    tagNames: ['medium']
  },
  {
    title: "Data Structures",
    description: "Questions focused on data structures in Python and JavaScript.",
    difficulty_level: "medium",
    questionIndices: [2, 6, 9, 10, 11],
    tagNames: ['medium']
  },
  {
    title: "Algorithmic Thinking",
    description: "Algorithmic and logical thinking questions for interviews.",
    difficulty_level: "hard",
    questionIndices: [7, 8, 12, 13, 14, 15],
    tagNames: ['hard']
  }
  // ... (Add more problem sets as needed)
];

async function findOrCreateTag(tagName, tagCache) {
  const lowerName = tagName.toLowerCase();
  if (tagCache[lowerName]) return tagCache[lowerName];
  
  let tag = await Tag.findOne({ where: { tag_name: { [Op.iLike]: lowerName } } });
  
  if (!tag) {
    const color = tagColorMap[lowerName] || getRandomColor();
    tag = await Tag.create({ tag_name: tagName, color_code: color });
    console.log(`Created new tag: ${tagName} with color ${color}`);
  }
  
  tagCache[lowerName] = tag;
  return tag;
}

async function generateSampleData() {
  try {
    await sequelize.sync();
    console.log('Database synced successfully');

    const tagCache = {};
    for (const tagName of sampleTags) {
      await findOrCreateTag(tagName, tagCache);
    }
    console.log('Tags ensured.');

    const createdQuestions = [];
    for (const questionData of sampleQuestions) {
      const { mcqOptions, fillBlankAnswer, tagNames = [], ...questionFields } = questionData;
      const question = await Question.create({
        ...questionFields,
        author_id: null,
        is_verified: true,
      });
      if (questionData.question_type === 'mcq' && mcqOptions) {
        for (const optionData of mcqOptions) {
          await McqOption.create({ question_id: question.question_id, ...optionData });
        }
      }
      if (questionData.question_type === 'fill_in_blank' && fillBlankAnswer) {
        await FillBlankAnswer.create({
          question_id: question.question_id,
          ...fillBlankAnswer
        });
      }
      // Associate tags
      for (const tagName of tagNames) {
        const tag = await findOrCreateTag(tagName, tagCache);
        await QuestionTag.findOrCreate({ where: { question_id: question.question_id, tag_id: tag.tag_id } });
      }
      createdQuestions.push(question);
      console.log(`Created question: ${question.title}`);
    }
    console.log(`Created ${createdQuestions.length} questions.`);

    const createdProblemSets = [];
    for (const problemSetData of sampleProblemSets) {
      const { questionIndices, tagNames = [], ...fields } = problemSetData;
      const problemSet = await ProblemSet.create({
        ...fields,
        author_id: null,
        is_verified: true,
        question_count: questionIndices.length
      });
      createdProblemSets.push(problemSet);
      // Associate questions
      for (let i = 0; i < questionIndices.length; i++) {
        const qIdx = questionIndices[i];
        if (createdQuestions[qIdx]) {
          await ProblemSetQuestion.create({
            problemset_id: problemSet.problemset_id,
            question_id: createdQuestions[qIdx].question_id,
            question_order: i + 1
          });
        }
      }
      // Associate tags
      for (const tagName of tagNames) {
        const tag = await findOrCreateTag(tagName, tagCache);
        await ProblemSetTag.findOrCreate({ where: { problemset_id: problemSet.problemset_id, tag_id: tag.tag_id } });
      }
      console.log(`Created problem set: ${problemSet.title}`);
    }
    console.log(`Created ${createdProblemSets.length} problem sets.`);

    console.log('\n=== Sample Data Generation Complete ===');
  } catch (error) {
    console.error('Error generating sample data:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

if (require.main === module) {
  generateSampleData();
}

module.exports = generateSampleData; 