# 🌍 WayMate - AI-Powered Collaborative Travel Planner

[WayMate Deployed](https://waymate.vercel.app/)
**WayMate** is a comprehensive, full-stack travel planning application designed to transform how users plan and experience their journeys.
It leverages a powerful **AI core** to generate dynamic, personalized itineraries and fosters **real-time collaboration** among travelers.

---

## ✨ Key Features

WayMate is more than just a travel app; it's a complete ecosystem built with a production-ready mindset.

### 🤖 AI-Powered Itinerary Generation

* **Intelligent Planning:** Creates detailed, day-by-day travel plans by aggregating data from multiple APIs (Google Places, OpenWeather, Mapbox).
* **Conversational AI:** Users can chat with an AI assistant that uses intent detection to differentiate between casual conversation and planning requests.
* **Rich Content:** Generates not just schedules, but also packing checklists, budget estimations, must-try food recommendations, and travel tips.

### 🤝 Real-Time Collaboration

* **Group Planning:** Users can form groups for trips, enabling a shared planning experience.
* **Live Chat:** A real-time group chat system built with **Socket.IO** allows seamless communication.
* **Collaborative AI Editing:**
  In a group chat, any member can command the AI (e.g.,
  `@waymate add a visit to the Eiffel Tower on day 2`)
  to dynamically update the shared trip itinerary for everyone in real time.

### 🚨 Live Travel Alerts

Automatically scrapes and categorizes real-time travel alerts (e.g., weather, safety, transport strikes) from **regional RSS feeds** relevant to the user's destination.

### 🔐 Robust Security

* **JWT Authentication:** Secure stateless authentication using access & refresh tokens.
* **Redis-Based Token Blacklisting:** Immediately invalidates user sessions on logout.
* **Layered Authorization:** Multi-level access control combining:

  * Authentication checks
  * Role-based permissions (user, admin)
  * Resource-specific rules (e.g., group members)
* **API Security:** Includes:

  * Redis-backed rate limiting
  * Security headers with Helmet
  * Input validation

---

## 🏗️ System Architecture

```
+--------------------------------+      +--------------------------------+
|      Clients (Web & Mobile)    |      |       External Services        |
+--------------------------------+      +--------------------------------+
| - React Web App                |      | - OpenRouter (LLM)             |
| - Native Mobile App            |      | - Google Places, Mapbox, etc.  |
+-----------------|--------------+      | - Unsplash, OpenWeather        |
                  |                     | - RSS Feeds (Alerts)           |
                  | (HTTPS / WSS)       +-----------------|--------------+
                  |                                       | (API Calls)
+-----------------v---------------------------------------v----------------+
|                                WayMate Server                           |
|-------------------------------------------------------------------------|
| +---------------------+  +---------------------+  +---------------------+ |
| |    Express App      |  |   Socket.IO Server  |  |    Rate Limiting    | |
| |  (RESTful Routes)   |  | (Real-Time Events)  |  |      (Redis)        | |
| +---------|-----------+  +----------|----------+  +----------|----------+ |
|           |                         |                        |            |
| +---------v-------------------------v------------------------v----------+ |
| |                              Middleware                               | |
| |  (Auth, Roles, Validation, Error Handling, Logging w/ Winston)        | |
| +---------------------------------|-------------------------------------+ |
|                                   |                                     |
| +---------------------------------v-------------------------------------+ |
| |                            Core Services                              | |
| |  - AuthService    - TripService    - AIService    - AlertService      | |
| +---------------------------------|-------------------------------------+ |
|                                   |                                     |
| +-----------------v---------------+----------------v------------------+ |
| |   MongoDB (Mongoose)          | |        Redis                     | |
| | - User Data, Trips, Groups    | | - Caching (API, AI)              | |
| | - Chat History, Notifications | | - Token Blacklist, Rate Limits   | |
| +-------------------------------+ +----------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## 🛠️ Technology Stack (Backend)

* **Framework:** Node.js, Express.js
* **Database:** MongoDB (Mongoose ODM)
* **In-Memory Store:** Redis (caching, rate limiting, security)
* **Real-Time:** Socket.IO
* **Authentication:** JWT (access & refresh tokens)
* **Security:** Helmet, bcrypt.js
* **File Uploads:** Multer, Cloudinary
* **API Integrations:** Axios (Google Places, OpenWeather, OpenTripMap, Unsplash)
* **Validation:** express-validator
* **Logging:** Winston, Morgan
* **Env Management:** dotenv

---

## 📁 Project Structure

```
WayMate/
├── Client/              # React Web Application
├── Mobile/              # Native Mobile Application (React Native)
├── Server/              # Node.js & Express.js Backend
│   ├── config/          # DB, Redis, Cloudinary connections
│   ├── controllers/     # Route handlers
│   ├── middlewares/     # Auth, validation, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── services/        # External API/AI logic
│   ├── utils/           # Helpers, logger, email
│   ├── app.js           # Express app config
│   └── server.js        # Main entry point
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started (Backend)

### ✅ Prerequisites

* Node.js (v16+)
* MongoDB (local or Atlas)
* Redis

### 🔧 Installation

```bash
# Clone the repo
git clone https://github.com/ankitsingh794/WayMate.git
cd WayMate/server

# Install dependencies
npm install
```

### ⚙️ Environment Variables

Create `.env` in `Server/`:

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGO_URI=your_mongodb_connection_string

# Redis
REDIS_URL=redis://127.0.0.1:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM="WayMate <no-reply@waymate.com>"

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key
OPENTRIPMAP_API_KEY=your_opentripmap_api_key
OPENWEATHER_API_KEY=your_openweathermap_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_api_key
MAPBOX_SECRET_KEY=your_mapbox_secret_key
GOOGLE_API_KEY=your_google_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### ▶️ Run the server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs on: **[http://localhost:5000](http://localhost:5000)**

---

## ⚡ Core API Endpoints

| Method | Endpoint                    | Description                           | Access  |
| ------ | --------------------------- | ------------------------------------- | ------- |
| POST   | `/api/auth/register`        | Register a new user                   | Public  |
| POST   | `/api/auth/login`           | Log in a user                         | Public  |
| POST   | `/api/auth/logout`          | Log out and blacklist tokens          | Private |
| GET    | `/api/trips`                | Get all trips for the user            | Private |
| POST   | `/api/trips`                | Create a new AI-generated trip plan   | Private |
| POST   | `/api/groups/trip/:tripId`  | Create a new collaborative trip group | Private |
| GET    | `/api/messages/session/:id` | Get chat history for a group session  | Private |

---

## 💡 Future Improvements

* **Expense Splitting:** Automatically split expenses entered by users.
* **Offline Support:** Cache itineraries for offline access.
* **Push Notifications:** Real-time alerts via Firebase Cloud Messaging.
* **Advanced AI Tools:** Integrate booking APIs for flights & hotels.

---

## 📬 Contact

**Your Name** – Portfolio(Under-Development) – [ankitsinghrjt794@gmail.com](mailto:ankitsinghrjt794@gmail.com)
**Project Link:** [WayMate GitHub Repo](https://github.com/ankitsingh794/waymate)

---
