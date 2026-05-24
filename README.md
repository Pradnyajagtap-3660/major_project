
# 🌊 SafePath — Smart GIS-Based Vulnerability Mapping and Evacuation Route Planner for Urban Flood Response in Mumbai.
A full-stack web application that helps Mumbai residents navigate flood emergencies by providing real-time flood risk mapping, safe route planning, hospital/shelter locators, and an AI-powered chatbot assistant.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Database](#database)

---

## Overview

SafePath is designed specifically for Mumbai, integrating flood risk data, road network topology, and real-time routing to help users make informed decisions during monsoon flooding. The system covers key Mumbai areas including Kurla, Dharavi, Andheri, Bandra, and many more, offering risk-aware navigation and emergency resource discovery.

---

## Features

- **🗺️ Flood Risk Map** — Interactive map visualizing flood-prone zones and waterlogging hotspots across Mumbai.
- **🛣️ Safe Route Finder** — Routing engine that calculates the safest path between two points, factoring in road flood risk scores.
- **🏥 Safe Hospital Finder** — Locates hospitals accessible via low-risk roads during a flood event.
- **🏠 Safe Shelter Finder** — Finds nearby emergency shelters with safe access routes.
- **🤖 AI Chatbot** — OpenAI-powered assistant with Mumbai-specific flood context; answers queries about area risk levels, BMC alerts, and evacuation advice.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Leaflet + React-Leaflet | Interactive maps |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| PostgreSQL + PostGIS | Spatial database |
| pg (node-postgres) | Database driver |
| JSON Web Tokens | Authentication |
| bcrypt / bcryptjs | Password hashing |
| Nodemailer | Email (OTP / password reset) |
| OpenAI API (gpt-4o-mini) | Chatbot intelligence |

---

## Project Structure

```
major_project/
├── back_end/
│   ├── controllers/          # Route handler logic
│   │   ├── authC.js          # Login / Signup
│   │   ├── chatbotC.js       # AI chatbot with flood context
│   │   ├── floodC.js         # Flood risk data
│   │   ├── fpC.js            # Forgot password / OTP
│   │   ├── geocodeC.js       # Address → coordinates
│   │   ├── hospitalC.js      # Hospital search
│   │   ├── safePathC.js      # Safe route calculation
│   │   ├── shelterC.js       # Shelter search
│   │   └── vulernabilityC.js # Vulnerability assessments
│   ├── routes/               # Express route definitions
│   ├── setup/                # DB setup scripts (SQL, Python, JS)
│   ├── utils/
│   │   └── sendEmail.js      # Nodemailer helper
│   ├── db.js                 # PostgreSQL connection pool
│   ├── server.js             # Express app entry point
│   ├── .env.example          # Environment variable template
│   └── package.json
│
├── front_end/
│   ├── public/
│   └── src/
│       ├── App.js            # Root component + routing
│       ├── Dashboard.js      # Main layout with sidebar nav
│       ├── Maps.js           # Flood risk map component
│       ├── ChatbotPanel.js   # AI chatbot UI
│       ├── SafeRouteFinder.js
│       ├── SafeRouteMap.js
│       ├── SafeHospitalFinder.js
│       ├── SafeShelterFinder.js
│       ├── StatisticsPanel.js
│       ├── Login.js
│       ├── Signup.js
│       └── ForgotPassword.js
│
└── start-all.bat             # Windows script to launch both servers
```

---

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** v14+ with the **PostGIS** extension
- An **OpenAI API key** (for the chatbot)
- An SMTP email account (Gmail or similar, for password reset emails)

---

## Setup & Installation

### 1. Clone / Extract the project

```bash
# If cloning from git
git clone <your-repo-url>
cd major_project
```

### 2. Install backend dependencies

```bash
cd back_end
npm install
```

### 3. Install frontend dependencies

```bash
cd ../front_end
npm install
```

### 4. Set up the database

Create a PostgreSQL database and enable PostGIS:

```sql
CREATE DATABASE flood_response;
\c flood_response
CREATE EXTENSION postgis;
CREATE EXTENSION pgrouting;  -- required for safe-path routing
```

Then run the setup scripts in `back_end/setup/` to load road topology and flood risk data:

```bash
# Example: load flood risk grid
cd back_end/setup
python loadFloodRiskGrid.py

# Create road network topology
node createTopology.js
```

Refer to `back_end/FLOOD_RISK_CALCULATION_GUIDE.md` and `back_end/ROUTING_IMPLEMENTATION.md` for detailed setup instructions.

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp back_end/.env.example back_end/.env
```

```env
# OpenAI
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o-mini

# PostgreSQL
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=flood_response
DB_PORT=5432
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## Running the Application

**Terminal 1 — Backend:**
```bash
cd back_end
node server.js
# Server starts on http://localhost:5001
```

**Terminal 2 — Frontend:**
```bash
cd front_end
npm start
# App opens on http://localhost:3000
```

---

## API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/signup` | Register a new user |
| `POST` | `/api/login` | Login and receive JWT |
| `POST` | `/api/forgot-password` | Send OTP to email |
| `POST` | `/api/verify-otp` | Verify OTP and reset password |
| `GET` | `/api/flood` | Get flood risk data |
| `GET` | `/api/hospitals` | Find nearby hospitals |
| `GET` | `/api/shelters` | Find nearby shelters |
| `GET` | `/api/safe-path` | Calculate safe route between two points |
| `GET` | `/api/vulnerability` | Get area vulnerability score |
| `POST` | `/api/chatbot` | Send message to AI chatbot |
| `GET` | `/api/geocode` | Convert address to coordinates |

---

## Database

The application uses a PostgreSQL database named `flood_response` with the following key tables:

- **`roads_in_risk`** — Road network with PostGIS geometry and `flood_risk` score (0–1)
- **`waterlogging_points`** — Known waterlogging locations with severity
- **`shelters`** — Emergency shelter locations
- **`hospitals`** — Hospital locations
- **`users`** — Registered user accounts

Flood risk scores are precomputed and stored per road segment. The `back_end/setup/` folder contains scripts to populate and recalculate this data.

---

## Acknowledgements

- Flood and waterlogging data sourced from BMC (Brihanmumbai Municipal Corporation) datasets.
- Road network data from OpenStreetMap.
- Routing powered by pgRouting.
