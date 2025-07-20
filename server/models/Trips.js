const mongoose = require('mongoose');

// ✅ Sub-schema for richer weather data
const weatherForecastSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: String },
  temp: { type: String },
  temp_min: { type: String },
  temp_max: { type: String },
  condition: { type: String },
  icon: { type: String },
  chance_of_rain: { type: Number },
  wind_speed: { type: Number },
}, { _id: false });

// ✅ Sub-schema for richer attraction data
const attractionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kinds: { type: String },
  description: { type: String },
  image: { type: String },
  wikidata: { type: String },
}, { _id: false });

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kinds: { type: String },
  description: { type: String },
}, { _id: false });

// ✅ Sub-schema for the new structured budget
const budgetSchema = new mongoose.Schema({
    total: { type: Number, required: true },
    travel: { type: Number },
    accommodation: { type: Number },
    activities: { type: Number },
    food: { type: Number },
}, { _id: false });


const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  group: {
    isGroup: { type: Boolean, default: false },
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' }
    }],
  },
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  destinationCoordinates: {
    lat: { type: Number },
    lon: { type: Number },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function () { return this.endDate >= this.startDate; },
      message: 'End date must be after start date'
    }
  },
  travelers: {
    type: Number,
    default: 1,
    min: 1,
  },
  preferences: {
    transportMode: { type: String },
    accommodationType: { type: String },
  },
  coverImage: {
    type: String,
  },
  routes: { type: mongoose.Schema.Types.Mixed }, // Use Mixed for flexible route object
  weather: {
    forecast: [weatherForecastSchema],
  },
  attractions: [attractionSchema],
  foodRecommendations: [foodSchema],
  alerts: [String],
  budget: budgetSchema, // ✅ Using the new structured budget schema
  itinerary: [{
    day: { type: Number, required: true },
    title: { type: String, required: true },
    activities: [String],
  }],
  accommodationSuggestions: {
      type: [Object],
      default: [],
  },
  formattedPlan: {
    type: String,
  },
  // ✅ Fields for enhanced AI data
  tips: [String],
  mustEats: [String],
  highlights: [String],
  packingChecklist: [String],
  favorite: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'canceled'],
    default: 'planned',
  },
}, { timestamps: true });

tripSchema.index({ userId: 1, startDate: -1 }); // Index for sorting trips

module.exports = mongoose.model('Trip', tripSchema);