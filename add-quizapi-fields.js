require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'your_database_name',
  username: process.env.DB_USER || 'your_database_user',
  password: process.env.DB_PASSWORD || 'your_database_password',
  logging: false
});

async function addQuizApiFields() {
  try {
    console.log('🔧 Adding QuizAPI fields to questions table...');
    
    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND column_name IN ('source', 'external_id')
    `);
    
    const existingColumns = results.map(row => row.column_name);
    
    if (!existingColumns.includes('source')) {
      console.log('➕ Adding source column...');
      await sequelize.query(`
        ALTER TABLE questions 
        ADD COLUMN source VARCHAR(50)
      `);
      console.log('✅ source column added');
    } else {
      console.log('✅ source column already exists');
    }
    
    if (!existingColumns.includes('external_id')) {
      console.log('➕ Adding external_id column...');
      await sequelize.query(`
        ALTER TABLE questions 
        ADD COLUMN external_id VARCHAR(100)
      `);
      console.log('✅ external_id column added');
    } else {
      console.log('✅ external_id column already exists');
    }
    
    console.log('🎉 QuizAPI fields setup complete!');
    
  } catch (error) {
    console.error('❌ Error adding QuizAPI fields:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addQuizApiFields(); 