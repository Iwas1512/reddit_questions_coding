const sequelize = require('../db');
const { Op } = require('sequelize');
const { Question, ProblemSet, McqOption, FillBlankAnswer, ProblemSetQuestion, User, Tag, QuestionTag, ProblemSetTag } = require('../associations/associations');

// === TAGS ===
// List all tags you want to use here. Difficulty tags are handled automatically.
const sampleTags = [
  'javascript', 'python', 'algorithms', 'data structures', 'frontend', 'backend', 
  'interview', 'loops', 'functions', 'arrays', 'objects', 'strings', 'logic',
  'async', 'es6', 'file-io', 'decorators', 'generators', 'memory', 'search',
  'complexity', 'sorting', 'stack', 'queue', 'lifo', 'fifo', 'lambda',
  'methods', 'exceptions', 'error-handling', 'debugging', 'modern', 'syntax',
  'basics', 'advanced'
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
    title: "JavaScript Promise Methods",
    question_text: "Which Promise method executes when ALL promises in an array are resolved?",
    question_type: "mcq",
    difficulty_level: "medium",
    explanation: "Promise.all() waits for all promises to resolve and returns an array of their results. If any promise rejects, the entire Promise.all() rejects.",
    code: "const promises = [fetch('/api/users'), fetch('/api/posts'), fetch('/api/comments')];\nPromise.all(promises)\n  .then(results => console.log('All data loaded:', results));",
    language: "javascript",
    tagNames: ['javascript', 'async', 'frontend'],
    mcqOptions: [
      { option_text: "Promise.race()", is_correct: false, option_order: 1 },
      { option_text: "Promise.all()", is_correct: true, option_order: 2 },
      { option_text: "Promise.any()", is_correct: false, option_order: 3 },
      { option_text: "Promise.allSettled()", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "JavaScript Destructuring Assignment",
    question_text: "What is the output of this destructuring assignment?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "Destructuring assignment extracts values from objects or arrays into distinct variables. The syntax {name, age} creates variables with the same names as the object properties.",
    code: "const person = {name: 'John', age: 30, city: 'NYC'};\nconst {name, age} = person;\nconsole.log(name, age);",
    language: "javascript",
    tagNames: ['javascript', 'es6', 'frontend'],
    mcqOptions: [
      { option_text: "John 30", is_correct: true, option_order: 1 },
      { option_text: "undefined undefined", is_correct: false, option_order: 2 },
      { option_text: "person.name person.age", is_correct: false, option_order: 3 },
      { option_text: "Error", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "JavaScript Event Loop",
    question_text: "What will be the output order of this code?",
    question_type: "mcq",
    difficulty_level: "hard",
    explanation: "The event loop processes tasks in this order: 1) Synchronous code, 2) Microtasks (Promises), 3) Macrotasks (setTimeout).",
    code: "console.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');",
    language: "javascript",
    tagNames: ['javascript', 'async', 'advanced'],
    mcqOptions: [
      { option_text: "1, 2, 3, 4", is_correct: false, option_order: 1 },
      { option_text: "1, 4, 3, 2", is_correct: true, option_order: 2 },
      { option_text: "1, 4, 2, 3", is_correct: false, option_order: 3 },
      { option_text: "4, 1, 3, 2", is_correct: false, option_order: 4 }
    ]
  },
  // --- Python MCQs ---
  {
    title: "Python Context Managers",
    question_text: "What is the correct way to use a context manager in Python?",
    question_type: "mcq",
    difficulty_level: "medium",
    explanation: "Context managers use the 'with' statement to automatically handle resource management, ensuring proper cleanup even if exceptions occur.",
    code: "with open('file.txt', 'r') as file:\n    content = file.read()\n# File is automatically closed here",
    language: "python",
    tagNames: ['python', 'file-io', 'backend'],
    mcqOptions: [
      { option_text: "try/finally block", is_correct: false, option_order: 1 },
      { option_text: "with statement", is_correct: true, option_order: 2 },
      { option_text: "manual close()", is_correct: false, option_order: 3 },
      { option_text: "del statement", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "Python Decorators",
    question_text: "What is the output of this decorated function?",
    question_type: "mcq",
    difficulty_level: "hard",
    explanation: "Decorators modify or enhance functions. The @timer decorator wraps the function and adds timing functionality.",
    code: "def timer(func):\n    def wrapper():\n        print('Starting...')\n        result = func()\n        print('Finished!')\n        return result\n    return wrapper\n\n@timer\ndef greet():\n    return 'Hello'\n\nprint(greet())",
    language: "python",
    tagNames: ['python', 'decorators', 'advanced'],
    mcqOptions: [
      { option_text: "Hello", is_correct: false, option_order: 1 },
      { option_text: "Starting...\nHello\nFinished!", is_correct: true, option_order: 2 },
      { option_text: "Starting...\nFinished!\nHello", is_correct: false, option_order: 3 },
      { option_text: "Error", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "Python Generators",
    question_text: "What is the output of this generator function?",
    question_type: "mcq",
    difficulty_level: "medium",
    explanation: "Generators use 'yield' to return values one at a time, maintaining state between calls. They're memory efficient for large datasets.",
    code: "def count_up_to(n):\n    for i in range(n):\n        yield i\n\ngen = count_up_to(3)\nprint(list(gen))",
    language: "python",
    tagNames: ['python', 'generators', 'memory'],
    mcqOptions: [
      { option_text: "[0, 1, 2]", is_correct: true, option_order: 1 },
      { option_text: "[1, 2, 3]", is_correct: false, option_order: 2 },
      { option_text: "[0, 1]", is_correct: false, option_order: 3 },
      { option_text: "Error", is_correct: false, option_order: 4 }
    ]
  },
  // --- Algorithm MCQs ---
  {
    title: "Binary Search Implementation",
    question_text: "What is the time complexity of binary search?",
    question_type: "mcq",
    difficulty_level: "medium",
    explanation: "Binary search has O(log n) time complexity because it divides the search space in half with each iteration.",
    code: "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1",
    language: "python",
    tagNames: ['algorithms', 'search', 'complexity'],
    mcqOptions: [
      { option_text: "O(n)", is_correct: false, option_order: 1 },
      { option_text: "O(log n)", is_correct: true, option_order: 2 },
      { option_text: "O(n²)", is_correct: false, option_order: 3 },
      { option_text: "O(1)", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "Bubble Sort Algorithm",
    question_text: "What is the worst-case time complexity of bubble sort?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "Bubble sort has O(n²) worst-case time complexity because it compares each element with every other element in the worst case.",
    code: "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr",
    language: "python",
    tagNames: ['algorithms', 'sorting', 'complexity'],
    mcqOptions: [
      { option_text: "O(n)", is_correct: false, option_order: 1 },
      { option_text: "O(n log n)", is_correct: false, option_order: 2 },
      { option_text: "O(n²)", is_correct: true, option_order: 3 },
      { option_text: "O(log n)", is_correct: false, option_order: 4 }
    ]
  },
  // --- Data Structures MCQs ---
  {
    title: "Stack Operations",
    question_text: "What is the LIFO principle in data structures?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "LIFO (Last In, First Out) means the last element added to the stack is the first one to be removed, like a stack of plates.",
    code: "stack = []\nstack.append(1)  # Push\nstack.append(2)  # Push\nstack.append(3)  # Push\nprint(stack.pop())  # Pop - removes 3",
    language: "python",
    tagNames: ['data structures', 'stack', 'lifo'],
    mcqOptions: [
      { option_text: "Last In, First Out", is_correct: true, option_order: 1 },
      { option_text: "First In, First Out", is_correct: false, option_order: 2 },
      { option_text: "Last In, Last Out", is_correct: false, option_order: 3 },
      { option_text: "First In, Last Out", is_correct: false, option_order: 4 }
    ]
  },
  {
    title: "Queue Implementation",
    question_text: "Which data structure follows the FIFO principle?",
    question_type: "mcq",
    difficulty_level: "easy",
    explanation: "A queue follows FIFO (First In, First Out) principle, like a line of people waiting for service.",
    code: "from collections import deque\nqueue = deque()\nqueue.append(1)  # Enqueue\nqueue.append(2)  # Enqueue\nqueue.append(3)  # Enqueue\nprint(queue.popleft())  # Dequeue - removes 1",
    language: "python",
    tagNames: ['data structures', 'queue', 'fifo'],
    mcqOptions: [
      { option_text: "Stack", is_correct: false, option_order: 1 },
      { option_text: "Queue", is_correct: true, option_order: 2 },
      { option_text: "Heap", is_correct: false, option_order: 3 },
      { option_text: "Tree", is_correct: false, option_order: 4 }
    ]
  },
  // --- Fill-in-the-blank Questions ---
  {
    title: "JavaScript Template Literals",
    question_text: "Complete the template literal syntax: const message = `Hello, ${___}!`;",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "Template literals use ${expression} syntax to embed expressions within string literals.",
    code: "const name = 'World';\nconst message = `Hello, ${name}!`;\nconsole.log(message);  // Hello, World!",
    language: "javascript",
    tagNames: ['javascript', 'es6', 'strings'],
    fillBlankAnswer: {
      correct_answer: "name",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python Lambda Function",
    question_text: "Complete the lambda function: square = lambda x: ___",
    question_type: "fill_in_blank",
    difficulty_level: "medium",
    explanation: "Lambda functions are anonymous functions defined with the lambda keyword, followed by parameters and an expression.",
    code: "square = lambda x: x**2\nprint(square(5))  # 25",
    language: "python",
    tagNames: ['python', 'lambda', 'functions'],
    fillBlankAnswer: {
      correct_answer: "x**2",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "JavaScript Arrow Function",
    question_text: "Complete the arrow function: const add = (a, b) => ___",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "Arrow functions provide a concise syntax for writing function expressions. The expression after => is implicitly returned.",
    code: "const add = (a, b) => a + b;\nconsole.log(add(3, 5));  // 8",
    language: "javascript",
    tagNames: ['javascript', 'es6', 'functions'],
    fillBlankAnswer: {
      correct_answer: "a + b",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python List Method",
    question_text: "Complete the list method: numbers.___()",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "The reverse() method reverses the order of elements in a list in-place.",
    code: "numbers = [1, 2, 3, 4, 5]\nnumbers.reverse()\nprint(numbers)  # [5, 4, 3, 2, 1]",
    language: "python",
    tagNames: ['python', 'lists', 'methods'],
    fillBlankAnswer: {
      correct_answer: "reverse",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "JavaScript Array Method",
    question_text: "Complete the array method: const doubled = numbers.___(num => num * 2);",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "The map() method creates a new array with the results of calling a function for every array element.",
    code: "const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(num => num * 2);\nconsole.log(doubled);  // [2, 4, 6, 8, 10]",
    language: "javascript",
    tagNames: ['javascript', 'arrays', 'methods'],
    fillBlankAnswer: {
      correct_answer: "map",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python Dictionary Method",
    question_text: "Complete the dictionary method: keys = my_dict.___()",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "The keys() method returns a view object containing the dictionary's keys.",
    code: "my_dict = {'a': 1, 'b': 2, 'c': 3}\nkeys = my_dict.keys()\nprint(list(keys))  # ['a', 'b', 'c']",
    language: "python",
    tagNames: ['python', 'dictionaries', 'methods'],
    fillBlankAnswer: {
      correct_answer: "keys",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "JavaScript Object Method",
    question_text: "Complete the object method: const entries = Object.___(obj);",
    question_type: "fill_in_blank",
    difficulty_level: "medium",
    explanation: "Object.entries() returns an array of a given object's own enumerable string-keyed property [key, value] pairs.",
    code: "const obj = {name: 'John', age: 30};\nconst entries = Object.entries(obj);\nconsole.log(entries);  // [['name', 'John'], ['age', 30]]",
    language: "javascript",
    tagNames: ['javascript', 'objects', 'methods'],
    fillBlankAnswer: {
      correct_answer: "entries",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python String Method",
    question_text: "Complete the string method: result = text.___(' ')",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "The split() method splits a string into a list where each word is a list item.",
    code: "text = 'Hello World Python'\nresult = text.split(' ')\nprint(result)  # ['Hello', 'World', 'Python']",
    language: "python",
    tagNames: ['python', 'strings', 'methods'],
    fillBlankAnswer: {
      correct_answer: "split",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "JavaScript String Method",
    question_text: "Complete the string method: const upper = str.___();",
    question_type: "fill_in_blank",
    difficulty_level: "easy",
    explanation: "The toUpperCase() method converts a string to uppercase letters.",
    code: "const str = 'hello world';\nconst upper = str.toUpperCase();\nconsole.log(upper);  // HELLO WORLD",
    language: "javascript",
    tagNames: ['javascript', 'strings', 'methods'],
    fillBlankAnswer: {
      correct_answer: "toUpperCase",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "Python Exception Handling",
    question_text: "Complete the exception handling: try:\n    result = 10 / 0\nexcept ___ as e:\n    print('Error:', e)",
    question_type: "fill_in_blank",
    difficulty_level: "medium",
    explanation: "ZeroDivisionError is raised when division or modulo by zero is encountered.",
    code: "try:\n    result = 10 / 0\nexcept ZeroDivisionError as e:\n    print('Error:', e)  # Error: division by zero",
    language: "python",
    tagNames: ['python', 'exceptions', 'error-handling'],
    fillBlankAnswer: {
      correct_answer: "ZeroDivisionError",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  },
  {
    title: "JavaScript Error Handling",
    question_text: "Complete the error handling: try {\n    throw new Error('Something went wrong');\n} catch (___) {\n    console.log('Caught:', error.message);\n}",
    question_type: "fill_in_blank",
    difficulty_level: "medium",
    explanation: "The catch block receives the error object as a parameter, which contains information about the error.",
    code: "try {\n    throw new Error('Something went wrong');\n} catch (error) {\n    console.log('Caught:', error.message);  // Caught: Something went wrong\n}",
    language: "javascript",
    tagNames: ['javascript', 'exceptions', 'error-handling'],
    fillBlankAnswer: {
      correct_answer: "error",
      is_case_sensitive: true,
      accepts_partial_match: false
    }
  }
];

// --- TEMPLATE: Add more problem sets below ---
// Each problem set should have a title, description, difficulty_level, questionIndices, and tagNames
const sampleProblemSets = [
  {
    title: "JavaScript Fundamentals",
    description: "Essential JavaScript concepts including ES6 features, async programming, and modern syntax.",
    difficulty_level: "easy",
    questionIndices: [1, 2, 12, 14, 16, 18],
    tagNames: ['javascript', 'frontend', 'es6']
  },
  {
    title: "Python Basics",
    description: "Core Python programming concepts covering syntax, functions, and basic data structures.",
    difficulty_level: "easy",
    questionIndices: [3, 5, 13, 15, 17, 19],
    tagNames: ['python', 'backend', 'basics']
  },
  {
    title: "Advanced JavaScript",
    description: "Advanced JavaScript concepts including promises, event loop, and complex patterns.",
    difficulty_level: "hard",
    questionIndices: [0, 2, 20],
    tagNames: ['javascript', 'async', 'advanced']
  },
  {
    title: "Advanced Python",
    description: "Advanced Python features including decorators, generators, and context managers.",
    difficulty_level: "hard",
    questionIndices: [3, 4, 5, 21],
    tagNames: ['python', 'decorators', 'advanced']
  },
  {
    title: "Algorithms & Complexity",
    description: "Fundamental algorithms and understanding of time complexity analysis.",
    difficulty_level: "medium",
    questionIndices: [6, 7],
    tagNames: ['algorithms', 'complexity', 'sorting']
  },
  {
    title: "Data Structures",
    description: "Essential data structures and their implementation principles.",
    difficulty_level: "easy",
    questionIndices: [8, 9],
    tagNames: ['data structures', 'stack', 'queue']
  },
  {
    title: "Error Handling",
    description: "Best practices for handling errors and exceptions in different languages.",
    difficulty_level: "medium",
    questionIndices: [20, 21],
    tagNames: ['exceptions', 'error-handling', 'debugging']
  },
  {
    title: "Modern Programming Features",
    description: "Modern programming features and syntax across different languages.",
    difficulty_level: "medium",
    questionIndices: [0, 1, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19],
    tagNames: ['es6', 'modern', 'syntax']
  }
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