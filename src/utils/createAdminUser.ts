import bcrypt from 'bcryptjs';
import { createUser } from './userDb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    
    const username = 'admin';
    const password = 'admin123'; // In production, use a strong password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminUser = await createUser({
      username,
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);
    
  } catch (error) {
    if ((error as any).code === '23505') {
      console.log('ℹ️  Admin user already exists');
    } else {
      console.error('❌ Error creating admin user:', error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  });
}

export default createAdminUser;
