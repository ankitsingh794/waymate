<div align="center">
  <br />
    <img src="https://i.imgur.com/your-logo-url.png" alt="WayMate Logo" width="150">
  <h1 align="center">🌍 WayMate - AI-Powered Collaborative Travel Planner</h1>
  <p align="center">
    A comprehensive, full-stack travel planning application designed to transform how users plan and experience their journeys.
    <br />
    <a href="https://github.com/ankitsingh794/WayMate"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://waymate.vercel.app/">View Deployed App</a>
    ·
    <a href="https://github.com/ankitsingh794/WayMate/issues">Report Bug</a>
    ·
    <a href="https://github.com/ankitsingh794/WayMate/issues">Request Feature</a>
  </p>
</div>

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Pull Requests Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Forks](https://img.shields.io/github/forks/ankitsingh794/WayMate?style=social)
![Stars](https://img.shields.io/github/stars/ankitsingh794/WayMate?style=social)

</div>

---

**WayMate** leverages a powerful **AI core** to generate dynamic, personalized itineraries and fosters **real-time collaboration** among travelers through a shared workspace and live chat.


---

## ✨ Key Features

WayMate is more than just a travel app; it's a complete ecosystem built with a production-ready, secure, and scalable mindset.

* **🤖 Conversational AI Core**
    * **Intelligent Intent Detection:** The AI assistant accurately understands user requests, distinguishing between planning a trip, finding a local spot, asking for travel advice, and casual chat.
    * **Dynamic Itinerary Generation:** Creates detailed, day-by-day travel plans by aggregating real-time data from multiple APIs (Google Places, OpenWeather, Mapbox).
    * **Rich Content Creation:** Generates not just schedules, but also packing checklists, detailed budget estimations, must-try food recommendations, and travel tips tailored to the user's vibe.

* **🤝 Real-Time Collaboration**
    * **Group Planning & Invites:** Users can form groups for trips via secure invite links, enabling a shared planning experience.
    * **Live Group Chat:** A real-time group chat system built with **Socket.IO** and a Redis adapter for scalability allows seamless communication.
    * **Collaborative AI Editing:** In a group chat, any authorized member can command the AI (e.g., `@waymate add a visit to the Eiffel Tower on day 2`) to dynamically update the shared trip itinerary for everyone in real time.

* **🚀 Advanced Travel Tools**
    * **Smart Train Schedules:** An intelligent system that finds the best train routes between locations by checking nearby stations and real-time seat availability.
    * **Live Travel Alerts:** Automatically scrapes and categorizes real-time travel alerts (e.g., weather, safety, transport strikes) from regional RSS feeds relevant to the user's destination.
    * **PDF Itinerary Downloads:** Users can download a beautifully formatted PDF of their complete travel plan.

* **🔐 Robust Security**
    * **Secure Authentication:** A complete JWT authentication system using short-lived access tokens and secure, `HttpOnly`, `sameSite: 'None'` refresh token cookies.
    * **Redis-Based Token Blacklisting:** Immediately invalidates user sessions on logout for enhanced security.
    * **API Security:** The backend is protected with Redis-backed rate limiting, security headers via Helmet, input sanitization against XSS and NoSQL injection, and detailed validation.

---

## 🛠️ Technology Stack

### Backend
* **Framework:** Node.js, Express.js
* **Database:** MongoDB (with Mongoose ODM)
* **In-Memory Store:** Redis (for Caching, Rate Limiting, Token Blacklisting, and Socket.IO Adapter)
* **Real-Time Communication:** Socket.IO
* **Authentication:** JWT (jsonwebtoken, bcrypt.js)
* **Security:** Helmet, express-mongo-sanitize, DOMPurify
* **File Uploads:** Multer, Cloudinary
* **API Integrations:** Axios
* **Validation:** express-validator
* **Logging:** Winston, Morgan

### Frontend
* **Framework:** React (with Vite)
* **Routing:** React Router
* **State Management:** React Context API
* **Internationalization:** i18n-next
* **Animations:** Lottie
* **API Client:** Axios

### Deployment
* **Frontend:** Vercel
* **Backend:** Render
---

## 🏗️ System Architecture

The existing architecture diagram accurately represents the system's robust, service-oriented design.

```

\+--------------------------------+      +--------------------------------+
|      Clients (Web & Mobile)    |      |       External Services        |
\+--------------------------------+      +--------------------------------+
| - React Web App (Vercel)       |      | - OpenRouter (LLM)             |
| - Mobile App (Future)          |      | - Google, Mapbox, Unsplash etc.|
\+-----------------|--------------+      | - RSS Feeds (Alerts)           |
|                     +-----------------|--------------+
| (HTTPS / WSS)                         | (API Calls)
\+-----------------v---------------------------------------v----------------+
|                         WayMate Server (Render)                           |
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
| | - User Data, Trips, Chats     | | - Caching, Token Blacklist       | |
| +-------------------------------+ +----------------------------------+ |
\+-------------------------------------------------------------------------+

````

---

## 🚀 Getting Started

### ✅ Prerequisites

* Node.js (v18+)
* MongoDB (local instance or a cloud service like Atlas)
* Redis (local instance or a cloud service like Redis Labs)

### 🔧 Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/ankitsingh794/WayMate.git](https://github.com/ankitsingh794/WayMate.git)
    cd WayMate
    ```
2.  **Install Server Dependencies:**
    ```sh
    cd server
    npm install
    ```
3.  **Install Client Dependencies:**
    ```sh
    cd ../client
    npm install
    ```
4.  **Set Up Environment Variables:**
    * Create a `.env` file inside the `server/` directory.
    * Copy the contents of `.env.example` (if present) or use the template below.
    * Fill in all the required API keys and secrets.

    **Template for `server/.env`:**
    ```env
    # Server & Client Config
    PORT=5000
    NODE_ENV=development
    CLIENT_URL=https://localhost:5173

    # Database & Cache
    MONGO_URI=your_mongodb_connection_string
    REDIS_URL=redis://127.0.0.1:6379

    # Authentication
    JWT_SECRET=your_super_secret_jwt_key
    JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key
    JWT_ACCESS_EXPIRE=15m
    JWT_REFRESH_COOKIE_EXPIRE=7

    # Email Service (e.g., Gmail with App Password)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_gmail_app_password

    # API Keys
    OPENROUTER_API_KEY=your_openrouter_api_key
    GOOGLE_API_KEY=your_google_cloud_api_key
    MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
    UNSPLASH_ACCESS_KEY=your_unsplash_access_key
    OPENWEATHER_API_KEY=your_openweathermap_api_key
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```

5.  **Generate Local SSL Certificates:**
    * For the best local development experience (matching the production environment), you need to run both servers over HTTPS. The easiest way is with `mkcert`.
    * Install `mkcert` (follow instructions for your OS).
    * Run these commands from inside your `server/` and `client/` directories:
        ```sh
        mkcert -install
        mkcert localhost
        ```
    * This will create `localhost.pem` and `localhost-key.pem` files, which the servers are configured to use in development mode.

### ▶️ Run The Application

You will need two separate terminals.

1.  **In Terminal 1 (from the `server/` directory):**
    ```sh
    npm run dev
    ```
2.  **In Terminal 2 (from the `client/` directory):**
    ```sh
    npm run dev
    ```
The frontend will be available at **https://localhost:5173** and the backend at **https://localhost:5000**.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

**Ankit Singh** – [@ankitsingh](https://www.linkedin.com/in/ankitsingh794/) – ankitsinghrjt794@gmail.com

**Project Link:** [https://github.com/ankitsingh794/WayMate](https://github.com/ankitsingh794/WayMate)
````