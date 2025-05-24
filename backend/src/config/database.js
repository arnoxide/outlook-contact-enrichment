//src/config/datatbase.js
const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
const initializeDatabase = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connected at:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('Database connection error:', error.message);
        throw error;
    }
};

// Execute query with error handling
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const start = Date.now();
        const result = await client.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Executed query:', { text, duration, rows: result.rowCount });
        }
        
        return result;
    } catch (error) {
        console.error('Database query error:', {
            error: error.message,
            query: text,
            params: params
        });
        throw error;
    } finally {
        client.release();
    }
};

// Transaction wrapper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Close database connections
const closeDatabase = async () => {
    try {
        await pool.end();
        console.log('Database connections closed');
    } catch (error) {
        console.error('Error closing database:', error);
    }
};

module.exports = {
    pool,
    query,
    transaction,
    initializeDatabase,
    closeDatabase
};