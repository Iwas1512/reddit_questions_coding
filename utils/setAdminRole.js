const { User } = require('../associations/associations.js');

/**
 * Utility script to set admin role for users during development
 * Usage: node utils/setAdminRole.js <email>
 */

async function setAdminRole(email) {
  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`❌ User with email '${email}' not found`);
      return;
    }

    await user.update({ role: 'admin' });
    console.log(`✅ Successfully set admin role for user: ${user.username} (${email})`);
    
    // Show updated user info
    const updatedUser = await User.findByPk(user.user_id, {
      attributes: { exclude: ['password_hash'] }
    });
    console.log('Updated user:', updatedUser.toJSON());
    
  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
  }
}

async function listAllUsers() {
  try {
    const users = await User.findAll({
      attributes: ['user_id', 'username', 'email', 'role', 'is_active']
    });
    
    console.log('\n📋 All Users:');
    console.table(users.map(user => user.toJSON()));
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

// Command line usage
if (require.main === module) {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node utils/setAdminRole.js <email>');
    console.log('Example: node utils/setAdminRole.js admin@example.com');
    console.log('\nOr to list all users: node utils/setAdminRole.js --list');
    process.exit(1);
  }
  
  if (email === '--list') {
    listAllUsers().then(() => process.exit(0));
  } else {
    setAdminRole(email).then(() => process.exit(0));
  }
}

module.exports = { setAdminRole, listAllUsers }; 