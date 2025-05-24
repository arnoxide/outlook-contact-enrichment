const { query } = require('../config/database');

class Contact {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.full_name = data.full_name;
        this.department = data.department;
        this.job_title = data.job_title;
        this.phone_number = data.phone_number;
        this.company = data.company;
        this.location = data.location;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Find contact by email
    static async findByEmail(email) {
        try {
            const result = await query(
                'SELECT * FROM contacts WHERE email = $1',
                [email.toLowerCase().trim()]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return new Contact(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Create or update contact
    static async upsert(contactData) {
        try {
            const {
                email,
                full_name,
                department,
                job_title,
                phone_number,
                company,
                location
            } = contactData;

            const result = await query(`
                INSERT INTO contacts (email, full_name, department, job_title, phone_number, company, location)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (email) 
                DO UPDATE SET 
                    full_name = EXCLUDED.full_name,
                    department = EXCLUDED.department,
                    job_title = EXCLUDED.job_title,
                    phone_number = EXCLUDED.phone_number,
                    company = EXCLUDED.company,
                    location = EXCLUDED.location,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                email.toLowerCase().trim(),
                full_name,
                department,
                job_title,
                phone_number,
                company,
                location
            ]);

            return new Contact(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Search contacts by various fields
    static async search(searchTerm, limit = 10) {
        try {
            const searchPattern = `%${searchTerm.toLowerCase()}%`;
            
            const result = await query(`
                SELECT * FROM contacts 
                WHERE LOWER(email) LIKE $1 
                   OR LOWER(full_name) LIKE $1 
                   OR LOWER(department) LIKE $1 
                   OR LOWER(job_title) LIKE $1
                   OR LOWER(company) LIKE $1
                ORDER BY 
                    CASE 
                        WHEN LOWER(email) = $2 THEN 1
                        WHEN LOWER(full_name) = $2 THEN 2
                        WHEN LOWER(email) LIKE $1 THEN 3
                        WHEN LOWER(full_name) LIKE $1 THEN 4
                        ELSE 5
                    END
                LIMIT $3
            `, [searchPattern, searchTerm.toLowerCase(), limit]);

            return result.rows.map(row => new Contact(row));
        } catch (error) {
            throw error;
        }
    }

    // Get contacts by department
    static async getByDepartment(department, limit = 50) {
        try {
            const result = await query(
                'SELECT * FROM contacts WHERE LOWER(department) = $1 ORDER BY full_name LIMIT $2',
                [department.toLowerCase(), limit]
            );

            return result.rows.map(row => new Contact(row));
        } catch (error) {
            throw error;
        }
    }

    // Get all contacts with pagination
    static async getAll(limit = 50, offset = 0) {
        try {
            const result = await query(
                'SELECT * FROM contacts ORDER BY full_name LIMIT $1 OFFSET $2',
                [limit, offset]
            );

            return result.rows.map(row => new Contact(row));
        } catch (error) {
            throw error;
        }
    }

    // Update contact
    async update(updateData) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            // Build dynamic update query
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id' && key !== 'email') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });

            if (fields.length === 0) {
                return this;
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(this.id);

            const result = await query(
                `UPDATE contacts SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            return new Contact(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Delete contact
    async delete() {
        try {
            await query('DELETE FROM contacts WHERE id = $1', [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Get contact statistics
    static async getStats() {
        try {
            const result = await query(`
                SELECT 
                    COUNT(*) as total_contacts,
                    COUNT(DISTINCT department) as total_departments,
                    COUNT(DISTINCT company) as total_companies,
                    COUNT(CASE WHEN phone_number IS NOT NULL THEN 1 END) as contacts_with_phone
                FROM contacts
            `);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            full_name: this.full_name,
            department: this.department,
            job_title: this.job_title,
            phone_number: this.phone_number,
            company: this.company,
            location: this.location,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = Contact;