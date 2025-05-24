
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    department VARCHAR(100),
    job_title VARCHAR(100),
    phone_number VARCHAR(20),
    company VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test user
INSERT INTO users (email, password_hash)
VALUES ('admin@example.com', '$2a$12$h.gZggoGO0uY0mi9DOhqeeZczO017BJGhDo3c/J9aJu5/YPNoPTVm')
ON CONFLICT (email) DO NOTHING;

-- Insert test contacts
INSERT INTO contacts (email, full_name, department, job_title, phone_number, company, location)
VALUES 
    ('admin@example.com', 'Admin User', 'IT', 'Manager', '+1-555-0001', 'Tech Corp', 'Pretoria, SA'),
    ('john.doe@example.com', 'John Doe', 'Engineering', 'Senior Software Engineer', '+1-555-0101', 'Tech Corp', 'Cape town, CA'),
    ('arnold.masutha@example.com', 'Arnold Masutha', 'Legal', 'Justice Consultant', '+1-555-0111', 'Justice Solutions', 'Pretoria, SA')
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title,
    phone_number = EXCLUDED.phone_number,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    updated_at = CURRENT_TIMESTAMP;
