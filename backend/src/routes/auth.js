const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Input validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must be at least 6 characters long and contain both letters and numbers')
];

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Verify password
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.email);

        res.json({
            message: 'Login successful',
            token: token,
            user: user.toJSON(),
            expires_in: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'Unable to process login request'
        });
    }
});

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email already exists'
            });
        }

        // Create new user
        const user = await User.create(email, password);

        // Generate JWT token
        const token = generateToken(user.id, user.email);

        res.status(201).json({
            message: 'Registration successful',
            token: token,
            user: user.toJSON(),
            expires_in: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message === 'Email already exists') {
            return res.status(409).json({
                error: 'User already exists',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Registration failed',
            message: 'Unable to create user account'
        });
    }
});

// Verify token endpoint (for checking if token is still valid)
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Token required',
                message: 'Please provide a token to verify'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        res.json({
            valid: true,
            user: user.toJSON(),
            expires_at: new Date(decoded.exp * 1000).toISOString()
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                valid: false,
                error: 'Invalid or expired token'
            });
        }

        console.error('Token verification error:', error);
        res.status(500).json({
            error: 'Verification failed',
            message: 'Unable to verify token'
        });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Token required',
                message: 'Please provide a token to refresh'
            });
        }

        const jwt = require('jsonwebtoken');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if user still exists
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: 'User not found'
                });
            }

            // Generate new token
            const newToken = generateToken(user.id, user.email);

            res.json({
                message: 'Token refreshed successfully',
                token: newToken,
                user: user.toJSON(),
                expires_in: 24 * 60 * 60 * 1000
            });

        } catch (jwtError) {
            // Even if token is expired, we can refresh it if it's not too old
            if (jwtError.name === 'TokenExpiredError') {
                const decoded = jwt.decode(token);
                
                // Only allow refresh if token expired less than 7 days ago
                const expiredAt = decoded.exp * 1000;
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                
                if (expiredAt > sevenDaysAgo) {
                    const user = await User.findById(decoded.userId);
                    if (user) {
                        const newToken = generateToken(user.id, user.email);
                        return res.json({
                            message: 'Expired token refreshed successfully',
                            token: newToken,
                            user: user.toJSON(),
                            expires_in: 24 * 60 * 60 * 1000
                        });
                    }
                }
            }
            
            throw jwtError;
        }

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Invalid or expired token',
                message: 'Please log in again'
            });
        }

        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Refresh failed',
            message: 'Unable to refresh token'
        });
    }
});

module.exports = router;