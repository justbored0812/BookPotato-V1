const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        address TEXT,
        user_number INTEGER,
        referred_by INTEGER,
        is_admin BOOLEAN DEFAULT FALSE,
        referral_code VARCHAR(20),
        total_referrals INTEGER DEFAULT 0,
        referral_earnings VARCHAR(20) DEFAULT '0',
        total_earnings VARCHAR(20) DEFAULT '0',
        rank VARCHAR(50) DEFAULT 'Bronze',
        commission_free_until TIMESTAMP,
        books_uploaded INTEGER DEFAULT 0,
        profile_picture TEXT,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');
    
    // Create societies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS societies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        code VARCHAR(20) UNIQUE NOT NULL,
        city VARCHAR(100) NOT NULL,
        apartment_count INTEGER NOT NULL,
        location TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_by INTEGER NOT NULL,
        member_count INTEGER DEFAULT 0,
        book_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Societies table created');
    
    // Create society_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS society_members (
        id SERIAL PRIMARY KEY,
        society_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(society_id, user_id)
      )
    `);
    console.log('✓ Society members table created');
    
    // Create books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(20),
        genre VARCHAR(100),
        description TEXT,
        image_url TEXT,
        cover_image_url TEXT,
        condition VARCHAR(20) DEFAULT 'Good',
        daily_fee VARCHAR(10) NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        owner_id INTEGER NOT NULL,
        society_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Books table created');
    
    // Create book_rentals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_rentals (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL,
        borrower_id INTEGER NOT NULL,
        lender_id INTEGER NOT NULL,
        society_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        actual_return_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        payment_status VARCHAR(20) DEFAULT 'pending',
        total_amount VARCHAR(10) NOT NULL,
        lender_amount VARCHAR(10) NOT NULL,
        platform_fee VARCHAR(10) NOT NULL,
        security_deposit VARCHAR(10) NOT NULL,
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Book rentals table created');
    
    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        data TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Notifications table created');
    
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Database setup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase()
  .then(() => {
    console.log('Database setup script finished.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
