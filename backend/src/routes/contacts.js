const express = require('express');
const { param, query, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All contact routes require authentication
router.use(authenticateToken);

// Get enriched contact data by email
router.get('/enrich/:email', [
    param('email').isEmail().withMessage('Please provide a valid email address')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email } = req.params;

        // Find contact by email
        const contact = await Contact.findByEmail(email);

        if (!contact) {
            return res.status(404).json({
                error: 'Contact not found',
                message: `No enrichment data found for ${email}`,
                email: email,
                enriched: false
            });
        }

        res.json({
            message: 'Contact enrichment data retrieved successfully',
            email: email,
            enriched: true,
            data: contact.toJSON()
        });

    } catch (error) {
        console.error('Contact enrichment error:', error);
        res.status(500).json({
            error: 'Enrichment failed',
            message: 'Unable to retrieve contact enrichment data'
        });
    }
});

// Search contacts
router.get('/search', [
    query('q').isLength({ min: 1 }).withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { q: searchTerm, limit = 10 } = req.query;

        const contacts = await Contact.search(searchTerm, parseInt(limit));

        res.json({
            message: 'Search completed successfully',
            query: searchTerm,
            count: contacts.length,
            results: contacts.map(contact => contact.toJSON())
        });

    } catch (error) {
        console.error('Contact search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: 'Unable to search contacts'
        });
    }
});

// Get contacts by department
router.get('/department/:department', [
    param('department').isLength({ min: 1 }).withMessage('Department name is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { department } = req.params;
        const { limit = 50 } = req.query;

        const contacts = await Contact.getByDepartment(department, parseInt(limit));

        res.json({
            message: 'Department contacts retrieved successfully',
            department: department,
            count: contacts.length,
            results: contacts.map(contact => contact.toJSON())
        });

    } catch (error) {
        console.error('Department contacts error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve department contacts'
        });
    }
});

// Get all contacts with pagination
router.get('/', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { limit = 50, offset = 0 } = req.query;

        const contacts = await Contact.getAll(parseInt(limit), parseInt(offset));

        res.json({
            message: 'Contacts retrieved successfully',
            count: contacts.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            results: contacts.map(contact => contact.toJSON())
        });

    } catch (error) {
        console.error('Get all contacts error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve contacts'
        });
    }
});

// Get contact statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Contact.getStats();

        res.json({
            message: 'Contact statistics retrieved successfully',
            statistics: stats
        });

    } catch (error) {
        console.error('Contact statistics error:', error);
        res.status(500).json({
            error: 'Statistics failed',
            message: 'Unable to retrieve contact statistics'
        });
    }
});

// Bulk enrichment endpoint (for multiple emails)
router.post('/enrich/bulk', async (req, res) => {
    try {
        const { emails } = req.body;

        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Please provide an array of email addresses'
            });
        }

        if (emails.length > 50) {
            return res.status(400).json({
                error: 'Too many emails',
                message: 'Maximum 50 emails allowed per request'
            });
        }

        // Validate all emails
        const invalidEmails = emails.filter(email => !Contact.isValidEmail(email));
        if (invalidEmails.length > 0) {
            return res.status(400).json({
                error: 'Invalid email addresses',
                invalid_emails: invalidEmails
            });
        }

        // Process each email
        const results = [];
        for (const email of emails) {
            try {
                const contact = await Contact.findByEmail(email);
                results.push({
                    email: email,
                    enriched: !!contact,
                    data: contact ? contact.toJSON() : null
                });
            } catch (error) {
                results.push({
                    email: email,
                    enriched: false,
                    error: 'Processing failed',
                    data: null
                });
            }
        }

        const enrichedCount = results.filter(r => r.enriched).length;

        res.json({
            message: 'Bulk enrichment completed',
            total_requested: emails.length,
            enriched_count: enrichedCount,
            results: results
        });

    } catch (error) {
        console.error('Bulk enrichment error:', error);
        res.status(500).json({
            error: 'Bulk enrichment failed',
            message: 'Unable to process bulk enrichment request'
        });
    }
});

module.exports = router;