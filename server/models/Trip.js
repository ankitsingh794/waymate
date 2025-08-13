const mongoose = require('mongoose');

const smartScheduleOptionSchema = new mongoose.Schema({
  trainName: { type: String },
  trainNumber: { type: String },
  departureTime: { type: String },
  arrivalTime: { type: String },
  duration: { type: String },
  availableClasses: [String],
  recommendationReason: { type: String }
}, { _id: false });

const smartScheduleSchema = new mongoose.Schema({
  sourceStation: { type: String },
  destinationStation: { type: String },
  travelDate: { type: String },
  options: [smartScheduleOptionSchema],
  lastUpdated: { type: Date }
}, { _id: false });

const placeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  website: { type: String },
  vicinity: { type: String },
  photo_reference: { type: String }
}, { _id: false });

// Sub-schema for richer weather data
const weatherForecastSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: String },
  temp: { type: String },
  condition: { type: String },
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  total: { type: Number, required: true },
  travel: { type: Number },
  accommodation: { type: Number },
  activities: { type: Number },
  food: { type: Number },
  breakdown: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const routeInfoSchema = new mongoose.Schema({
  fastest: { type: Object },
  cheapest: { type: Object },
  details: { type: mongoose.Schema.Types.Mixed },
  staticMap: { type: String }
}, { _id: false });

const localEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date },
  description: { type: String },
  link: { type: String }
}, { _id: false });

const aiSummarySchema = new mongoose.Schema({
  overview: String,
  highlights: [String],
  tips: [String],
  mustEats: [String],
  packingChecklist: [String]
}, { _id: false });

const TripSchema = new mongoose.Schema({
  destination: { type: String, required: true, trim: true },
  origin: {
    city: { type: String },
    coords: {
      lat: { type: Number },
      lon: { type: Number }
    }
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
  group: {
    isGroup: { type: Boolean, default: false },
    members: [{
      _id: false,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: {
        type: String,
        enum: ['owner', 'editor', 'viewer'],
        default: 'viewer',
        required: true
      }
    }]
  },
  preferences: {
    transportMode: { type: String },
    accommodationType: { type: String },
    currency: { type: String, default: 'USD' },
    language: { type: String, default: 'en' }
  },
  coverImage: { type: String },
  routeInfo: routeInfoSchema,
  weather: { forecast: [weatherForecastSchema] },
  attractions: [placeSchema],
  foodRecommendations: [placeSchema],
  accommodationSuggestions: [placeSchema],
  budget: budgetSchema,
  localEvents: [localEventSchema],
  alerts: [String],
  itinerary: [{
    day: { type: Number, required: true },
    title: { type: String, required: true },
    activities: [String],
  }],
  aiSummary: aiSummarySchema,
  inviteTokens: [{
    token: { type: String, required: true },
    expires: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  smartSchedule: {
    type: smartScheduleSchema,
    default: null
  },
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'canceled'],
    default: 'planned',
  },
  sentAlerts: {
    type: [String],
    default: []
  },
  favorite: { type: Boolean, default: false }
}, { timestamps: true });

TripSchema.virtual('dayCount').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

TripSchema.index({ 'group.members.userId': 1, startDate: -1 });
TripSchema.index({ destination: 'text' });
TripSchema.index(
  { 'inviteTokens.token': 1 },
  {
    unique: true,
    partialFilterExpression: { 'inviteTokens.token': { $exists: true } }
  }
);

module.exports = mongoose.model('Trip', TripSchema);