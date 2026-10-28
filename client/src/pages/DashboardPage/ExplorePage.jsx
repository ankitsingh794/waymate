import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { VscArrowLeft, VscCompass, VscLocation, VscSearch } from 'react-icons/vsc';
import api from '../../utils/axiosInstance';
import DashboardNavbar from '../../components/DashboardNavbar';
import './ExplorePage.css';

const FALLBACK_EXPLORE_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

const PlaceCard = ({ place }) => {
  const mapQuery = encodeURIComponent(`${place.name || ''} ${place.address || place.vicinity || ''}`);
  const mapsUrl = place.link || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const imageUrl = place.imageUrl || place.image || FALLBACK_EXPLORE_IMAGE;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="explore-card-link"
      aria-label={`Open ${place.name} in Google Maps`}
    >
      <article className="explore-card">
        <div className="explore-card-media">
          <img
            src={imageUrl}
            alt={place.name}
            className="explore-card-image"
            loading="lazy"
            decoding="async"
          />
          {place.rating && (
            <span className="explore-card-rating">★ {place.rating}</span>
          )}
        </div>
        <div className="explore-card-content">
          <h3>{place.name}</h3>
          {place.reason && <p className="explore-card-reason">{place.reason}</p>}
          <p className="explore-card-address">
            <VscLocation aria-hidden="true" /> {place.address || place.vicinity || 'Local area'}
          </p>
          <span className="explore-card-action">View on Google Maps ↗</span>
        </div>
      </article>
    </a>
  );
};

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlaces = async (latitude, longitude) => {
      if (!query) {
        setLoading(false);
        setError('No destination or search term specified.');
        return;
      }
      try {
        const url = `/find-places?query=${encodeURIComponent(query)}&location=current&lat=${latitude}&lon=${longitude}`;
        const response = await api.get(url);
        const placesData = response?.data?.data;
        setPlaces(Array.isArray(placesData) ? placesData : []);
      } catch (err) {
        console.error('Explore page fetch error:', err);
        setError('Could not retrieve places for this area. Please try again.');
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchPlaces(latitude, longitude);
        },
        () => {
          // Fallback fetch without geo
          fetchPlaces(0, 0);
        },
        { timeout: 7000 }
      );
    } else {
      fetchPlaces(0, 0);
    }
  }, [query]);

  return (
    <div className="explore-page">
      <DashboardNavbar />
      <main className="explore-content">
        <header className="explore-header">
          <div className="explore-back-row">
            <Link to="/dashboard" className="explore-back-link">
              <VscArrowLeft aria-hidden="true" /> Back to Dashboard
            </Link>
          </div>
          <span className="explore-eyebrow">Location Discovery Studio</span>
          <h1>
            Discovering <em>{query || 'curated destinations'}</em>
          </h1>
          <p>
            Real-time recommendations curated from local geospatial data and verified neighborhood reviews.
          </p>
        </header>

        {loading && (
          <div className="explore-loading-state">
            <div className="explore-spinner" aria-hidden="true" />
            <p>Scanning regional routes and verified spots...</p>
          </div>
        )}

        {error && (
          <div className="explore-notice is-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="explore-places-grid">
            {places.length > 0 ? (
              places.map((place, idx) => (
                <PlaceCard place={place} key={place.place_id || place._id || idx} />
              ))
            ) : (
              <div className="explore-empty-state">
                <VscCompass aria-hidden="true" />
                <h3>No places found for "{query}"</h3>
                <p>Try searching for cafes, cultural spots, or dining in another neighborhood.</p>
                <Link to="/dashboard" className="explore-return-btn">
                  Return to Dashboard
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
