const bcrypt = require('bcrypt');
const { query } = require('../config/database');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new user
    static async create(email, password) {
        try {
            // Hash the password
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const result = await query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
                [email.toLowerCase().trim(), password_hash]
            );

            return new User(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Email already exists');
            }
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const result = await query(
                'SELECT * FROM users WHERE email = $1',
                [email.toLowerCase().trim()]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const result = await query(
                'SELECT * FROM users WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password_hash);
        } catch (error) {
            throw error;
        }
    }

    // Update user password
    async updatePassword(newPassword) {
        try {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(newPassword, saltRounds);

            const result = await query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [password_hash, this.id]
            );

            return new User(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get all users (admin function)
    static async getAll(limit = 100, offset = 0) {
        try {
            const result = await query(
                'SELECT id, email, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );

            return result.rows.map(row => new User(row));
        } catch (error) {
            throw error;
        }
    }

    // Delete user
    async delete() {
        try {
            await query(
                'DELETE FROM users WHERE id = $1',
                [this.id]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Convert to JSON (excluding sensitive data)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate password strength
    static isValidPassword(password) {
        // At least 6 characters, contains at least one letter and one number
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
        return passwordRegex.test(password);
    }
}

module.exports = User;