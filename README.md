# 🌍 WayMate — Smart AI Travel Assistant

WayMate is an intelligent, mobile-first travel assistant app designed to help users plan trips, pack smartly based on weather, stay safe with local alerts, and even chat with a smart assistant about their plans — all in a clean and pastel-friendly UI.

---

## 🧠 Features

- ✈️ Smart Trip Planning (with route suggestions)
- 🎒 Weather-Based Packing Lists
- 📍 Local Emergency Alerts
- 💬 Conversational Travel Assistant (rule-based + AI-ready)
- 🔄 Offline Support with Sync
- 📷 Visual Place Scanner (WayMate Lens - WIP)
- 💾 Firebase/MongoDB support (free-tier friendly)
- 🧭 Map support with Mapbox / OpenRouteService
- 🌐 Mobile-first design (PWA-ready)

---

## 📁 Project Structure

```

/client        # React frontend with Tailwind + Chat UI
/server        # Node.js + Express backend with MongoDB
README.md

````

---

## 🚀 Getting Started

### 🛠 Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or local MongoDB)
- Optional: OpenWeatherMap API, Mapbox token

---

### 🔧 Backend Setup (`/server`)
```bash
cd server
npm install
npm run dev
````

* Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongo_connection_string
OPENWEATHER_API_KEY=your_key
MAPBOX_API_KEY=your_key
JWT_SECRET=your_secret
```

---

### 🎨 Frontend Setup (`/client`)

```bash
cd client
npm install
npm run dev
```

* Vite + React + Tailwind
* Set up `.env` file:

```env
VITE_API_BASE=http://localhost:5000
```

---

## 📦 Deployment

* Frontend: Vercel / Netlify (PWA capable)
* Backend: Render / Railway / Fly.io / Cyclic

---

## 🧠 Future Roadmap

* [x] Trip planner with weather & route
* [x] Offline-first support
* [x] Basic assistant chat
* [ ] GPT assistant integration
* [ ] Vision-based place scanner (WayMate Lens)
* [ ] Group trip support
* [ ] Eco & safety layers
* [ ] Travel journal generator

---

## 📸 Screenshots

> *Add UI screenshots or design mockups here.*

---

## 🤝 Contributions

Contributions, feedback, and ideas are welcome! Open issues or fork and submit PRs.

---

## 📄 License

MIT License — open and free to use.

````