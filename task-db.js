// test-db.js
require('dotenv').config();
const { Pool } = require('pg');

// .env에 있는 DATABASE_URL 사용
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ DB Connected! Time:', result.rows[0]);
  } catch (err) {
    console.error('❌ Connection Error:', err);
  } finally {
    pool.end();
  }
}

test();