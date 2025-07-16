# 🌍 **WayMate – The AI Travel Companion You Deserve** ✈

**Web + Mobile | AI-Powered | Free & Open-Source**

Planning trips is exciting—but also stressful. Multiple apps, endless tabs, and surprises like bad weather or closed attractions can ruin your experience.

**WayMate solves that.**
An **AI-powered travel assistant** that helps you **plan smarter, travel safer, and stay connected**—all in **one platform**, across **Web and Mobile**.

---

## ✅ **What is WayMate?**

WayMate is your **personal travel assistant**, combining:
✔ **AI Chat** for personalized trip planning
✔ **Smart Itineraries**
✔ **Weather Updates & Packing Suggestions**
✔ **Budget Estimates**
✔ **Interactive Maps**
✔ **Real-Time Local Alerts from Social Media**
✔ **Connect with Friends** for group trips
✔ **Offline AI Mode** (unique feature!)

---

## 🌟 **Key Features**

### **Core**

* 💬 **AI Chat Assistant** – Plan trips through natural conversation.
* 🗓 **Itinerary Planner** – Day-wise smart plans tailored to your preferences.
* 🏨 **Recommendations** – Hotels, attractions, food spots from real APIs.
* 🌦 **Weather Insights** – Real-time forecasts + AI packing tips.
* 💸 **Budget Estimator** – Calculate trip costs before you leave.

### **Standout Features**

* **Offline AI Mode** – Works without internet using local LLM (Ollama).
* **Interactive Maps** – Visualize destinations and itineraries.
* **Voice Interaction** – Talk to your AI travel buddy.
* **Social Travel** – Connect with friends, share and co-create itineraries.
* **Local Alerts** – Pull news and safety info from Twitter/X and IG pages.

---

## 🛠 **Tech Stack**

| Layer              | Tech                                            |
| ------------------ | ----------------------------------------------- |
| **Frontend (Web)** | React + Tailwind CSS + Framer Motion            |
| **Mobile**         | React Native (Expo)                             |
| **Backend**        | Node.js + Express                               |
| **Database**       | MongoDB Atlas                                   |
| **AI Layer**       | Hugging Face API / Ollama (Offline mode)        |
| **APIs**           | OpenTripMap, OpenWeather, Unsplash, Twitter API |

---

## 🗺 **Architecture**

```
                         ┌─────────────────────────────┐
                        │         USERS               │
                        │  (Web & Android App)        │
                        └─────────────┬──────────────┘
                                      │
                      ┌───────────────▼────────────────┐
                      │      FRONTEND LAYER            │
                      │ (React for Web, React Native)  │
                      ├─────────────────────────────────┤
                      │ Features:                      │
                      │  • AI Chat Screen              │
                      │  • Maps & Explore Screen       │
                      │  • Itinerary Planner           │
                      │  • Alerts & Notifications      │
                      │  • Group Chat & Travel Mode    │
                      └───────────────┬────────────────┘
                                      │ API Calls
       ┌──────────────────────────────▼─────────────────────────────────┐
       │                        BACKEND (Node.js + Express)             │
       │-----------------------------------------------------------------│
       │ **Modules:**                                                   │
       │  1. Auth Service  → JWT-based login/signup                     │
       │  2. AI Chat Service → Hugging Face API                         │
       │  3. Weather Service → OpenWeatherMap API                       │
       │  4. Places Service → OpenTripMap API                           │
       │  5. Images Service → Unsplash API                              │
       │  6. Alerts Service → RSS Parser + Weather Alerts               │
       │  7. Groups Service → Create/Join Group                         │
       │  8. Real-time Chat → Socket.io                                 │
       │  9. Notifications → Firebase Cloud Messaging / Expo Push       │
       └───────────────┬────────────────────────────────────────────────┘
                       │
                       │ Handles Business Logic + Aggregation
                       │
     ┌─────────────────▼─────────────────────┐
     │          DATABASE (MongoDB)          │
     │---------------------------------------│
     │ **Collections:**                      │
     │  - Users                              │
     │  - Trips                              │
     │  - Groups                             │
     │  - Chat Messages                      │
     │  - Alerts Cache                       │
     └───────────────────────────────────────┘

   External APIs:  
   ┌─────────────────────────┐   ┌───────────────────────────┐
   │ OpenWeatherMap          │   │ Unsplash (Images)         │
   └─────────────────────────┘   └───────────────────────────┘
   ┌─────────────────────────┐   ┌───────────────────────────┐
   │ OpenTripMap (Places)    │   │ Hugging Face (AI Chat)    │
   └─────────────────────────┘   └───────────────────────────┘
   ┌─────────────────────────┐
   │ RSS Feeds (Local News)  │
   └─────────────────────────┘

```

---

## 🌐 **Features vs Others**

✅ AI + Weather + Maps + Social Alerts → All-in-One Experience
✅ Offline Mode → Unique Edge
✅ Free Forever + Open Source

---

## 🚀 **Getting Started**

### 1. Clone Repo

```bash
git clone https://github.com/YOUR-USERNAME/WayMate.git
cd WayMate
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend (Web)

```bash
cd frontend
npm install
npm run dev
```

### 4. Mobile

```bash
cd mobile
npm install
npx expo start
```

---

## ⚙ **Environment Variables**

```
MONGODB_URI=your_mongo_uri
HF_API_KEY=your_huggingface_key
OPENTRIPMAP_API_KEY=your_api_key
OPENWEATHER_API_KEY=your_api_key
UNSPLASH_API_KEY=your_api_key
TWITTER_API_KEY=your_api_key
```

---

## 🗓 **Roadmap**

✅ Phase 1: AI Chat + Backend + DB
✅ Phase 2: Web UI + Itinerary Planner
✅ Phase 3: Mobile App Integration
✅ Phase 4: Social Features + Alerts + Offline AI
✅ Phase 5: Deploy (Web + Backend + DB)

---

## 🎥 **Demo**

*(Coming Soon)*

---

## ⭐ **Why WayMate Stands Out**

* **One App → All Travel Needs**
* **AI-Powered Planning**
* **Weather + Social Alerts + Packing Suggestions**
* **Friends + Social Travel**
* **Offline Mode → Privacy & Reliability**

---

## 👤 **Author**

**Ankit Singh**
📧 [ankitsinghrjt794@gmail.com](mailto:ankitsinghrjt794@gmail.com) | [LinkedIn](https://www.linkedin.com/in/ankitsingh794/) | [Portfolio](#)

---

