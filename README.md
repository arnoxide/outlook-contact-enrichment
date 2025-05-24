# outlook-contact-enrichment
a secure, containerized Outlook add-in with a backend API, JWT authentication

# Outlook Contact Enrichment Add-in

## Overview
This project is an Outlook add-in that enriches email sender information by fetching additional contact details (full name, department, phone number, job title) from a secure backend API. The backend uses Node.js with Express, PostgreSQL for user credentials, and JWT for authentication. The entire solution is containerized using Docker and Docker Compose for easy setup and deployment.

## Setup Instructions

### Prerequisites
- Docker and Docker Compose are installed.
- Node.js (optional, for local development outside Docker).

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/arnoxide/outlook-contact-enrichment.git
   cd outlook-contact-enrichment

Run Containers:

docker-compose up --build
Access Add-in: Open http://localhost:3001 and login with admin@example.com/admin123.

Testing

Login:
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}'

Contact Enrichment: After login, verify contact details for admin@example.com.

Outlook Testing:
Use ngrok http 3001 for HTTPS.
Update manifest.xml with the ngrok URL.
Sideload in Outlook Web Access.

Authentication Flow

User submits email/password via the login form.

Backend verifies credentials against PostgreSQL, issues a JWT.
Frontend stores JWT in localStorage and uses it for /api/contacts/enrich.

API validates JWT before returning contact data.

Technology Choices
Backend: Node.js/Express, PostgreSQL, JWT, bcrypt.
Frontend: HTML/JavaScript with Office.js.
Docker: Containerizes frontend, backend, and database.

Resources

Office.js Documentation
jsonwebtoken
bcrypt
Docker Documentation
Challenges

Resolved Office.js Unchecked runtime.lastError with promise-based getAsync.

Fixed 404 /api/auth/login by correcting frontend URL.
Added favicon to suppress 404 errors.