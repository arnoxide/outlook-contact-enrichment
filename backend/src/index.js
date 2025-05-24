const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
    origin: ['http://localhost:8080', 'http://frontend:3001'],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW()');
        console.log('Database connected at:', result.rows[0].now);
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
};

const startServer = async () => {
    try {
        console.log('Initializing database connection...');
        await initializeDatabase();
        console.log('Database connected successfully');

        // Health check endpoint
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
            });
        });

        // Login endpoint
        app.post('/api/login', async (req, res) => {
            const { email, password } = req.body;
            console.log('Login attempt:', { email });

            // Validate request body
            if (!email || !password) {
                console.log('Missing email or password');
                return res.status(400).json({ error: 'Email and password are required' });
            }

            try {
                const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
                const user = result.rows[0];
                if (!user) {
                    console.log('User not found:', email);
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
                if (!user.password_hash) {
                    console.log('No password hash for user:', email);
                    return res.status(500).json({ error: 'Invalid user data: missing password hash' });
                }
                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                if (!passwordMatch) {
                    console.log('Password mismatch for:', email);
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
                const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                console.log('Login successful:', email);
                res.json({ token, user: { id: user.id, email: user.email, name: user.name || null } });
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({ error: 'Internal server error', message: error.message });
            }
        });

        // Contact enrichment endpoint
        app.post('/api/contacts/enrich', async (req, res) => {
            const { email } = req.body;
            const token = req.headers.authorization?.split(' ')[1];
            console.log('Contact enrichment attempt:', { email });
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            try {
                jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                console.log('Invalid token for contact enrichment:', email);
                return res.status(401).json({ error: 'Invalid token' });
            }
            try {
                const result = await pool.query('SELECT * FROM contacts WHERE email = $1', [email]);
                const contact = result.rows[0];
                if (!contact) {
                    console.log('No contact found:', email);
                    return res.status(200).json({ contact: null });
                }
                res.json({ contact });
            } catch (error) {
                console.error('Contact enrichment error:', error);
                res.status(500).json({ error: 'Internal server error', message: error.message });
            }
        });

        // Token validation endpoint
        app.get('/api/auth/validate', (req, res) => {
            const token = req.headers.authorization?.split(' ')[1];
            console.log('Token validation attempt');
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            try {
                jwt.verify(token, process.env.JWT_SECRET);
                res.status(200).json({ valid: true });
            } catch (error) {
                console.log('Token validation failed:', error.message);
                res.status(401).json({ error: 'Invalid token' });
            }
        });

        // Global 404 handler
        app.use((req, res) => {
            console.log('404 - Route not found:', req.originalUrl);
            res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();