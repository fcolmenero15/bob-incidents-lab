#!/bin/sh
set -e

echo "🔄 Waiting for database to be ready..."
until node -e "
const pg = require('pg');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
pool.query('SELECT 1')
  .then(() => { console.log('✅ Database is ready'); process.exit(0); })
  .catch(() => { console.log('⏳ Waiting...'); process.exit(1); });
" 2>/dev/null; do
  sleep 2
done

echo "🔄 Checking if database needs initialization..."
if node -e "
const pg = require('pg');
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
pool.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \\'users\\')')
  .then(res => {
    if (res.rows[0].exists) {
      console.log('✅ Database already initialized');
      process.exit(0);
    } else {
      console.log('🔄 Database needs initialization');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error checking database:', err);
    process.exit(1);
  });
" 2>/dev/null; then
  echo "✅ Database already initialized, skipping init"
else
  echo "🔄 Initializing database schema..."
  node src/db/init.js || {
    echo "❌ Database initialization failed"
    exit 1
  }
fi

echo "🚀 Starting application..."
exec "$@"

# Made with Bob
