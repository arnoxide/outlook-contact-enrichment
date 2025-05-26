
# Outlook Contact Enrichment Add-in

## 🔍 Overview
This project is a secure, containerized **Outlook Add-in** that enriches email sender information by fetching additional contact details such as:
- Full name
- Department
- Phone number
- Job title

The solution includes a backend API with **JWT authentication**, a frontend built with **Office.js**, and is fully containerized using **Docker** and **Docker Compose**.

## ⚙️ Tech Stack
- **Backend**: Node.js, Express.js, PostgreSQL, JWT, bcrypt  
- **Frontend**: HTML, JavaScript, Office.js  
- **DevOps**: Docker, Docker Compose, ngrok

## 🚀 Features
- JWT-based secure login
- PostgreSQL for user data
- REST API for contact enrichment
- Office.js integration for Outlook Add-in
- Containerized with Docker
- Ready for sideloading in Outlook via HTTPS using ngrok

## ✅ Prerequisites
Ensure the following are installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (Optional for local backend development)
- [Ngrok](https://ngrok.com/) (For HTTPS access in Outlook)

## 🧩 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/arnoxide/outlook-contact-enrichment.git
cd outlook-contact-enrichment

2. Start Docker Containers

bash
docker-compose up --build
This will spin up:
Frontend (Office Add-in) → http://localhost:3001
Backend API → http://localhost:3000
PostgreSQL database

3. Expose Frontend with HTTPS via ngrok
Before testing the add-in in Outlook, expose your local frontend via HTTPS:

bash
ngrok http 8081
Ngrok will output a public HTTPS URL like: https://abc123.ngrok.io
update authtoken and hostname in ngrok.yml (create an account at ngrok.com)

🔁 Update all URLs in manifest.xml to use the generated HTTPS ngrok URL instead of localhost:3001.

4. Access the App in Browser
Visit:
http://localhost:8081 or ngrok URL
Login using:

Email: admin@example.com
Password: admin123

🔐 Authentication Flow

User submits login form with email and password.
Backend verifies the credentials in PostgreSQL.
Backend issues a JWT token.
Frontend stores JWT in localStorage.
All subsequent API requests include the JWT in the Authorization header.

🧪 API Testing

Login (Get JWT)
bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
Contact Enrichment
bash
curl -X GET http://localhost:3000/api/contacts/enrich \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"


📬 Outlook Integration

1. Update Manifest
Edit the manifest.xml and replace all:
xml
https://localhost:3001
with:
xml
https://your-ngrok-url.ngrok.io


2. Sideload into Outlook
Follow Microsoft’s sideloading instructions for either:
Outlook Web (OWA)
Outlook Desktop (Developer Mode)
Upload the updated manifest.xml.

🗃️ Project Structure
pgsql
outlook-contact-enrichment/
├── backend/              # Node.js Express API
│   ├── routes/
│   ├── models/
│   └── index.js
├── frontend/             # HTML + Office.js frontend
│   └── index.html
├── manifest.xml          # Office Add-in manifest
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md

🧠 Troubleshooting
🔴 502 Bad Gateway: Ensure backend is running and accessible inside the Docker network.
⚠️ JWT expired or invalid: Re-authenticate using the login endpoint.
🧩 Add-in not showing up: Ensure you're using an HTTPS URL via ngrok and manifest.xml is updated accordingly.
🧯 Office.js runtime.lastError: Resolved with promise-based async logic.
🧙 404 on /api/auth/login: URL mismatch resolved by correcting frontend/backend routes.