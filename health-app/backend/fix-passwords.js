import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPasswords() {
  try {
    console.log('Generating password hash for "demo123"...');
    const hash = await bcrypt.hash('demo123', 10);
    console.log('Hash generated:', hash);

    console.log('\nUpdating demo user password...');
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, 'demo']
    );

    console.log('Updating john.doe user password...');
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [hash, 'john.doe']
    );

    console.log('\n✅ Passwords updated successfully!');
    console.log('You can now login with:');
    console.log('  Username: demo');
    console.log('  Password: demo123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPasswords();

// Made with Bob
