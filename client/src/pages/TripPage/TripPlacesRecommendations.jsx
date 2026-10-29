import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCompass,
  VscHeart,
  VscLocation,
  VscSearch,
  VscStarFull,
} from 'react-icons/vsc';
import { GiForkKnifeSpoon } from 'react-icons/gi';
import { IoBedOutline } from 'react-icons/io5';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import { Badge, Button, Loading } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TripPlacesRecommendations.css';

const CATEGORY_FALLBACK_IMAGES = {
  attractions:
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
  food:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  stays:
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
};

function getPlaceImage(place, category) {
  if (place.image && typeof place.image === 'string' && place.image.startsWith('http')) return place.image;
  if (place.photoUrl && typeof place.photoUrl === 'string' && place.photoUrl.startsWith('http')) return place.photoUrl;
  if (Array.isArray(place.photos) && place.photos[0] && typeof place.photos[0] === 'string') return place.photos[0];
  if (Array.isArray(place.photos) && place.photos[0]?.url) return place.photos[0].url;
  return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.attractions;
}

export default function TripPlacesRecommendations() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('attractions');

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/trips/${id}`);
      const tripData = res?.data?.data?.trip || res?.data?.data || null;
      setTrip(tripData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load places.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const attractions = trip?.attractions || [];
  const food = trip?.foodRecommendations || [];
  const stays = trip?.accommodationSuggestions || [];

  let currentList = attractions;
  if (activeCategory === 'food') currentList = food;
  if (activeCategory === 'stays') currentList = stays;

  if (loading) {
    return (
      <div className="places-rec-page">
        <DashboardNavbar />
        <div className="places-rec-shell">
          <TripSubNav />
          <div className="places-loading">
            <Loading
              size="lg"
              label={`Curating places in ${trip?.destination || 'your destination'}...`}
              sublabel="Accessing verified sights, local dining, and boutique stays"
              dark
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="places-rec-page">
      <DashboardNavbar />

      <div className="places-rec-ambient" aria-hidden="true">
        <div className="places-rec-orb places-rec-orb-1" />
        <div className="places-rec-orb places-rec-orb-2" />
      </div>

      <div className="places-rec-shell">
        {/* Top Back Link */}
        <div className="places-rec-top-nav">
          <Link to={`/trip/${id}`} className="places-rec-back-link">
            <VscArrowLeft />
            <span>Back to {trip?.destination || 'Trip'} Overview</span>
          </Link>
        </div>

        {/* Expedition Sub-nav */}
        <TripSubNav />

        {/* Header */}
        <header className="places-rec-header">
          <div>
            <div className="places-rec-eyebrow">
              <span className="places-live-dot" />
              <span>AREA INTELLIGENCE</span>
            </div>
            <h1>Curated Points of Interest</h1>
            <p>
              High-confidence attractions, authentic dining, and verified stays recommended for{' '}
              {trip?.destination || 'your destination'}.
            </p>
          </div>

          <div className="places-rec-header-actions">
            <Link to="/explore" className="btn btn-primary">
              <VscSearch className="btn-icon" />
              <span>Explore More in Studio</span>
            </Link>
          </div>
        </header>

        {/* Category Segmented Control */}
        <section className="places-category-nav" role="tablist">
          <button
            type="button"
            className={`places-cat-btn ${activeCategory === 'attractions' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('attractions')}
          >
            <VscCompass />
            <span>Curated Sights ({attractions.length})</span>
          </button>
          <button
            type="button"
            className={`places-cat-btn ${activeCategory === 'food' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('food')}
          >
            <GiForkKnifeSpoon />
            <span>Local Dining ({food.length})</span>
          </button>
          <button
            type="button"
            className={`places-cat-btn ${activeCategory === 'stays' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('stays')}
          >
            <IoBedOutline />
            <span>Lodging & Stays ({stays.length})</span>
          </button>
        </section>

        {/* Places Grid */}
        <section className="places-grid">
          {currentList.length === 0 ? (
            <div className="places-empty-card">
              <VscLocation className="empty-icon" />
              <h3>No places catalogued in this category</h3>
              <p>
                You can search for live places nearby using the City Discovery studio or ask the AI assistant to curate recommendations.
              </p>
              <Link to="/explore" className="btn btn-primary">
                Open Discovery Studio ↗
              </Link>
            </div>
          ) : (
            currentList.map((place, idx) => {
              const mapQuery = encodeURIComponent(
                `${place.name || ''} ${place.vicinity || trip?.destination || ''}`
              );
              const mapUrl =
                place.website ||
                `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

              const imgSrc = getPlaceImage(place, activeCategory);

              return (
                <article key={idx} className="place-item-card">
                  <div className="place-item-media">
                    <img
                      src={imgSrc}
                      alt={place.name || 'Place photo'}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        const fallback = CATEGORY_FALLBACK_IMAGES[activeCategory] || CATEGORY_FALLBACK_IMAGES.attractions;
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                    <div className="place-item-scrim" />
                    {place.rating && (
                      <span className="place-rating-badge">
                        <VscStarFull /> {place.rating}
                        {place.reviews ? ` (${place.reviews})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="place-item-content">
                    <h3>{place.name || 'Featured Location'}</h3>
                    <p className="place-vicinity">
                      <VscLocation /> {place.vicinity || trip?.destination || 'Local area'}
                    </p>
                    {place.description && (
                      <p className="place-desc">{place.description}</p>
                    )}

                    <div className="place-item-footer">
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="place-map-link"
                      >
                        <span>View on Map</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
