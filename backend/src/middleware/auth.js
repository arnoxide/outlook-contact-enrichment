const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                message: 'Please provide a valid authentication token'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists in database
        const userResult = await query(
            'SELECT id, email FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            email: userResult.rows[0].email
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'The provided token is malformed or invalid'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please log in again to continue'
            });
        }

        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'Unable to verify token'
        });
    }
};

// Optional authentication middleware (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userResult = await query(
                'SELECT id, email FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userResult.rows.length > 0) {
                req.user = {
                    id: decoded.userId,
                    email: userResult.rows[0].email
                };
            }
        }

        next();
    } catch (error) {
        // For optional auth, we don't fail on invalid tokens
        console.log('Optional auth failed:', error.message);
        next();
    }
};

// Generate JWT token
const generateToken = (userId, email) => {
    const payload = {
        userId: userId,
        email: email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256'
    });
};

// Verify token without middleware (for utilities)
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    verifyToken
};