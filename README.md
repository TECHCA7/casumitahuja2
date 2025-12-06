CA Office Suite
An Integrated AI-Powered Office Management System for Chartered Accountants

Developed by: CA Sumit Ahuja
Status: Level-2 AICA Project – Full-Stack + AI Integration
Prototype: https://casumitahuja.lovable.app

📌 Overview

CA Office Suite is a full-stack, AI-enabled office application designed to streamline internal operations of Chartered Accountants.
It integrates client document automation, PDF utilities, OCR using Gemini, CMA data management, billing, and role-based office workflow into one unified platform.

The system has been developed using a combination of modern development tools, cloud services, databases, and custom APIs to demonstrate advanced AICA Level-2 capabilities.

🚀 Key Features
1. Multi-Role Authentication

Secure, scalable access control using Supabase Auth:

Admin – full access to staff, clients, system settings.

Staff – access to operational tools and client utilities.

Restricted Staff – limited functionalities based on permissions.

2. PDF Utility Suite (Python FastAPI)

Custom APIs built in Python for:

Split PDF

Merge PDF

Unlock PDF

PDF to Excel

PDF to Word

APIs are fully modular and can run locally or be deployed on cloud.

3. OCR & Document Intelligence (Gemini API)

AI-powered extraction of text and structured data from:

PAN / Aadhaar

Form-16

Invoices

Bank statements

Other client documents

Outputs are returned in text or JSON, reducing manual data entry.

4. CMA & Project Report Module

Forms for inputting business financial data, storing them into Supabase, and enabling automated CMA preparation for loan proposals.

5. Attendance & Office Workflow

Attendance marking system with role-specific dashboards and operational tools.

6. Frontend Built with Next.js

UI initially prototyped using Lovable, then exported to GitHub and enhanced using Visual Studio Code, enabling:

Refined UI/UX

Reusable components

Extended integrations not supported by Lovable

Security hardening

7. Cloud-Ready Deployment

Application is currently available/local but supports deployment on:

Render Web Services

Google Cloud Run

AWS EC2 / Beanstalk

Office LAN environments

8. Complete Version Control Lifecycle

Full development tracked through GitHub to ensure transparency, maintainability, and scalability.

🛠 Technology Stack
Layer	Technology Used
Frontend	Next.js / React (Lovable-generated base)
Backend Database	Supabase (PostgreSQL)
Authentication	Supabase Auth + Row Level Security
API Services	Python FastAPI for PDF tools
AI / OCR	Google Gemini API
Deployment	Render, Google Cloud, AWS-ready
Version Control	Git & GitHub
Dev Tools	Lovable, VS Code
📂 Project Structure
/project-root
│── /app               # Frontend components/pages
│── /lib               # Utilities and shared functions
│── /api               # API endpoints (Next.js)
│── /python-services   # Custom Python FastAPI for PDF tools
│── /public            # Static assets
│── /styles            # Global CSS
│── /supabase          # Database schema/config
│── package.json
│── README.md
│── .env.example

⚙️ Environment Variables

Create a .env file using the .env.example template.

Required keys:

SUPABASE_URL=
SUPABASE_ANON_KEY=
GEMINI_API_KEY=
PYTHON_API_BASE_URL=


Ensure appropriate RLS settings are configured inside Supabase.

💻 Installation & Setup
1. Clone Repository
git clone https://github.com/yourusername/ca-office-suite.git
cd ca-office-suite

2. Install Dependencies
npm install

3. Configure Environment

Add .env file with Supabase & Gemini credentials.

4. Run Python API Services
cd python-services
uvicorn main:app --reload

5. Start Development Server
npm run dev

6. Visit Application
http://localhost:3000

🌐 Deployment
Render

Create a new Web Service

Connect this GitHub repository

Add environment variables

Deploy

Google Cloud

Use Cloud Run or App Engine

Containerize using Dockerfile

Deploy with environment secrets

AWS

Use EC2, ECS or Elastic Beanstalk

Configure security groups & domain

📌 Known Limitations / Next Steps

Production deployment pending on Google/AWS.

Load balancing for Python API to be added.

Enhanced logging and audit trails under development.

Mobile-responsive optimization in progress.

📘 Project Purpose – AICA Level-2

This project demonstrates:

Full-stack application design

Secure authentication logic

Database modelling with RLS

Integration of AI + OCR systems

Building custom APIs in Python

Use of modern cloud deployment workflows

Practical CA-specific automation

This repository is part of the requirements for obtaining the AICA Level-2 Certification.

🤝 Contribution Guidelines

Contributions are welcome.
Please create a pull request with a clear description of the changes.

📄 License

This project is published under the MIT License.
You may use, modify, and distribute the project with appropriate attribution.

📞 Contact

Developer: CA Sumit Ahuja
Email: casumit000@gmail.com
Office: Near Girjakund, Nehru Road, Seoni, M.P. – 480661
