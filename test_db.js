import "dotenv/config";
import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to:", process.env.DATABASE_URL);
    await client.connect();
    console.log("✅ Successfully connected to Replit database!");
    
    // Check for tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables found:", res.rows.map(r => r.table_name).join(", "));
    
    // Check user count
    const userRes = await client.query('SELECT count(*) FROM users');
    console.log("Total users in Replit DB:", userRes.rows[0].count);
    
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await client.end();
  }
}

testConnection();
