/**
 * @fileoverview Defines the Mongoose schema for a Trip, supporting a robust group model with roles
 * and detailed sub-schemas for rich data representation.
 */

const mongoose = require('mongoose');

// Sub-schema for richer weather data
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

// Sub-schema for richer attraction data
const attractionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kinds: { type: String },
  description: { type: String },
  image: { type: String },
  wikidata: { type: String },
}, { _id: false });

// Sub-schema for food recommendations
const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kinds: { type: String },
  description: { type: String },
}, { _id: false });

// Sub-schema for the structured budget
const budgetSchema = new mongoose.Schema({
    total: { type: Number, required: true },
    travel: { type: Number },
    accommodation: { type: Number },
    activities: { type: Number },
    food: { type: Number },
}, { _id: false });

const routeSchema = new mongoose.Schema({
    mode: { type: String, enum: ['flight', 'train', 'car', 'bus'], required: true },
    provider: { type: String },
    details: { type: mongoose.Schema.Types.Mixed } // Can be flexible for different route types
}, { _id: false });

// FIX: Defined a specific sub-schema for accommodation
const accommodationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String }, // e.g., Hotel, Airbnb
    rating: { type: Number },
    link: { type: String }
}, { _id: false });

// FIX: Defined a specific sub-schema for local events
const localEventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date },
    description: { type: String },
    link: { type: String }
}, { _id: false });


const TripSchema = new mongoose.Schema({
  /**
   * ✅ FINALIZED: Using a robust group object with roles.
   * This is the single source of truth for trip membership and permissions.
   */
  group: {
    isGroup: { type: Boolean, default: false },
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  routes: [routeSchema],
  
  weather: { forecast: [weatherForecastSchema] },
  attractions: [attractionSchema],
  foodRecommendations: [foodSchema],
  accommodationSuggestions: [accommodationSchema],
  alerts: [String],
  budget: budgetSchema,
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
  tips: [String],
  mustEats: [String],
  highlights: [String],
  packingChecklist: [String],
  localEvents: [localEventSchema],
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

TripSchema.index({ 'group.members.userId': 1, startDate: -1 });

TripSchema.index({ destination: 'text' });

module.exports = mongoose.model('Trip', TripSchema);
