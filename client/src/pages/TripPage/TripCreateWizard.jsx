import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  VscArrowLeft,
  VscArrowRight,
  VscCalendar,
  VscCheck,
  VscCompass,
  VscLocation,
  VscRobot,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Button } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TripCreateWizard.css';

const PURPOSE_OPTIONS = [
  { id: 'leisure', label: 'Leisure & Vacation', desc: 'Relaxation, sightseeing, cultural exploration' },
  { id: 'work', label: 'Business & Remote Work', desc: 'Conferences, client meetings, remote work retreat' },
  { id: 'education', label: 'Education & Study', desc: 'Academic study tours, student exchanges' },
  { id: 'shopping', label: 'Shopping & Markets', desc: 'Artisanal markets, luxury districts, shopping fest' },
  { id: 'personal_business', label: 'Personal & Family', desc: 'Weddings, family reunions, personal commitments' },
];

const TRANSPORT_OPTIONS = [
  { id: 'any', label: 'Any / Balanced', desc: 'Optimal blend of speed and comfort' },
  { id: 'flight', label: 'Aviation / Flights', desc: 'Fastest route for distant destinations' },
  { id: 'train', label: 'Railways & Trains', desc: 'Scenic rail journeys, overnight express' },
  { id: 'bus', label: 'Intercity Bus', desc: 'Budget-friendly regional transit' },
  { id: 'car', label: 'Road Trip / Drive', desc: 'Self-driven routes with flexibility' },
];

export default function TripCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [destination, setDestination] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [purpose, setPurpose] = useState('leisure');
  const [transportMode, setTransportMode] = useState('any');
  const [accommodationType, setAccommodationType] = useState('Hotel');
  const [budgetEstimate, setBudgetEstimate] = useState('');
  const [currency, setCurrency] = useState('INR');

  const validateStep1 = () => {
    if (!destination.trim()) {
      setError('Please provide a destination city or country.');
      return false;
    }
    if (!startDate) {
      setError('Please choose a start date.');
      return false;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after the start date.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePrevious = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create AI session or prompt AI planner to generate trip with user constraints
      const promptText = `Please generate a structured itinerary for a trip to ${destination}${originCity ? ` starting from ${originCity}` : ''} from ${startDate} to ${endDate || startDate}. Purpose: ${purpose}. Transport preference: ${transportMode}. Travelers: ${travelers}. Expected budget: ${currency} ${budgetEstimate || 'moderate'}.`;

      // Find or create AI chat session
      const sessionRes = await api.post('/chat/sessions/ai');
      const sessionId = sessionRes?.data?.data?.sessionId || sessionRes?.data?.data?._id;

      if (!sessionId) {
        throw new Error('Could not initialize trip creation session.');
      }

      // Send instruction message to backend AI assistant
      const aiRes = await api.post(`/chat/message/ai/${sessionId}`, {
        message: promptText,
      });

      const createdTripId =
        aiRes?.data?.data?.tripId ||
        aiRes?.data?.data?.createdTrip?._id ||
        aiRes?.data?.data?.trip?._id;

      if (createdTripId) {
        navigate(`/trip/${createdTripId}`);
      } else {
        // If AI returned plan in chat, route user to AI assistant to review
        navigate('/assistant');
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Could not complete trip creation. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wizard-page">
      <DashboardNavbar />

      <div className="wizard-ambient" aria-hidden="true">
        <div className="wizard-orb wizard-orb-1" />
        <div className="wizard-orb wizard-orb-2" />
      </div>

      <main className="wizard-shell">
        {/* Universal Top-Left Back Link */}
        <div className="wizard-top-nav">
          <Link to="/trips" className="wizard-back-link">
            <VscArrowLeft /> Back to All Journeys
          </Link>
        </div>

        {/* Step Progress Stepper */}
        <header className="wizard-header">
          <div className="wizard-eyebrow">
            <span className="wizard-live-dot" />
            <span>Itinerary Architect</span>
          </div>
          <h1>Design Bespoke Expedition</h1>
          <p>Configure your destination, transit modes, and pacing to generate a fully operational itinerary.</p>

          <div className="wizard-stepper">
            <div className={`wizard-step-node ${step >= 1 ? 'is-active' : ''}`}>
              <span className="step-num">{step > 1 ? <VscCheck /> : '1'}</span>
              <span className="step-label">Destination & Dates</span>
            </div>
            <div className={`wizard-step-line ${step >= 2 ? 'is-filled' : ''}`} />
            <div className={`wizard-step-node ${step >= 2 ? 'is-active' : ''}`}>
              <span className="step-num">{step > 2 ? <VscCheck /> : '2'}</span>
              <span className="step-label">Purpose & Transit</span>
            </div>
            <div className={`wizard-step-line ${step >= 3 ? 'is-filled' : ''}`} />
            <div className={`wizard-step-node ${step >= 3 ? 'is-active' : ''}`}>
              <span className="step-num">3</span>
              <span className="step-label">Travelers & Budget</span>
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="wizard-card">
          {/* STEP 1: Destination & Dates */}
          {step === 1 && (
            <div className="wizard-step-body">
              <h2>Where & when are you departing?</h2>
              <p className="wizard-step-sub">Specify your arrival destination and expedition timeline.</p>

              <div className="wizard-form-grid">
                <div className="wizard-form-group">
                  <label htmlFor="wizardDestination">
                    Destination City or Region <span className="req">*</span>
                  </label>
                  <div className="wizard-input-wrap">
                    <VscLocation />
                    <input
                      id="wizardDestination"
                      type="text"
                      placeholder="e.g. Darjeeling, West Bengal / Kyoto, Japan"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardOrigin">Starting City (Origin)</label>
                  <div className="wizard-input-wrap">
                    <VscCompass />
                    <input
                      id="wizardOrigin"
                      type="text"
                      placeholder="e.g. New Delhi / Bangalore (Optional)"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardStartDate">
                    Departure Date <span className="req">*</span>
                  </label>
                  <div className="wizard-input-wrap">
                    <VscCalendar />
                    <input
                      id="wizardStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardEndDate">Return / Completion Date</label>
                  <div className="wizard-input-wrap">
                    <VscCalendar />
                    <input
                      id="wizardEndDate"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Purpose & Transit Mode */}
          {step === 2 && (
            <div className="wizard-step-body">
              <h2>Select Expedition Purpose & Travel Mode</h2>
              <p className="wizard-step-sub">This aligns our AI route optimization with your travel style.</p>

              <div className="wizard-options-section">
                <h3>Primary Journey Purpose</h3>
                <div className="wizard-options-grid">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`wizard-option-tile ${purpose === opt.id ? 'is-selected' : ''}`}
                      onClick={() => setPurpose(opt.id)}
                    >
                      <div className="tile-check">{purpose === opt.id && <VscCheck />}</div>
                      <h4>{opt.label}</h4>
                      <p>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="wizard-options-section">
                <h3>Preferred Transit Mode</h3>
                <div className="wizard-options-grid">
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`wizard-option-tile ${transportMode === opt.id ? 'is-selected' : ''}`}
                      onClick={() => setTransportMode(opt.id)}
                    >
                      <div className="tile-check">{transportMode === opt.id && <VscCheck />}</div>
                      <h4>{opt.label}</h4>
                      <p>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Travelers & Budget */}
          {step === 3 && (
            <div className="wizard-step-body">
              <h2>Travel Party & Budget Estimates</h2>
              <p className="wizard-step-sub">Ensure expense splits and accommodation suggestions fit your squad.</p>

              <div className="wizard-form-grid">
                <div className="wizard-form-group">
                  <label htmlFor="wizardTravelers">Number of Travelers</label>
                  <input
                    id="wizardTravelers"
                    type="number"
                    min="1"
                    max="50"
                    value={travelers}
                    onChange={(e) => setTravelers(Number(e.target.value))}
                  />
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardAccommodation">Preferred Lodging</label>
                  <select
                    id="wizardAccommodation"
                    value={accommodationType}
                    onChange={(e) => setAccommodationType(e.target.value)}
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="Resort">Resort & Spa</option>
                    <option value="Apartment">Apartment / Airbnb</option>
                    <option value="Hostel">Hostel & Workspace</option>
                    <option value="Boutique">Boutique Heritage</option>
                  </select>
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardCurrency">Currency</label>
                  <select
                    id="wizardCurrency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="wizard-form-group">
                  <label htmlFor="wizardBudget">Approximate Total Budget</label>
                  <input
                    id="wizardBudget"
                    type="number"
                    placeholder="e.g. 25000"
                    value={budgetEstimate}
                    onChange={(e) => setBudgetEstimate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Universal Bottom Sticky Form Bar: Cancel/Back on Left, Next/Submit on Right */}
          <footer className="wizard-footer">
            <Button
              variant="outline"
              onClick={step === 1 ? () => navigate('/trips') : handlePrevious}
            >
              {step === 1 ? 'Cancel' : 'Previous Step'}
            </Button>

            {step < 3 ? (
              <Button variant="primary" icon={VscArrowRight} iconPosition="right" onClick={handleNext}>
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={VscRobot}
                loading={loading}
                onClick={handleCreateTrip}
              >
                Generate Smart Itinerary with AI
              </Button>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}
