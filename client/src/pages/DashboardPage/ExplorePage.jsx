import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import DashboardNavbar from '../../components/DashboardNavbar';
import './ExplorePage.css';

const PlaceCard = ({ place }) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query_place_id=$`;
    const imageUrl = place.imageUrl || 'https://via.placeholder.com/400x300.png?text=Image+Not+Available';;

    return (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="place-card-link">
            <div className="place-card">
                <img src={imageUrl} alt={place.name} className="place-card-image" loading="lazy" decoding="async" />
                <div className="place-card-content">
                    <h3>{place.name}</h3>
                    <p className="place-rating">Rating: {place.rating || 'N/A'}</p>
                    <p className="place-reason">{place.reason}</p>
                    <p className="place-address">{place.address}</p>
                </div>
            </div>
        </a>
    );
};


export default function ExplorePage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    useEffect(() => {
        const fetchPlaces = async (latitude, longitude) => {
            if (!query) {
                setLoading(false);
                setError('No search query provided.');
                return;
            }
            try {
                const url = `/find-places?query=${encodeURIComponent(query)}&location=current&lat=${latitude}&lon=${longitude}`;
                const response = await api.get(url);

                const placesData = response.data.data;
                if (Array.isArray(placesData)) {
                    setPlaces(placesData);
                } else {
                    console.warn('API did not return an array for places, defaulting to empty.');
                    setPlaces([]);
                }

            } catch (err) {
                console.error("Explore page fetch error:", err);
                setError('Could not fetch results. Please try again later.');
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
                (geoError) => {
                    console.error("Geolocation error:", geoError);
                    setError('Could not get your location. Please enable location services in your browser.');
                    setLoading(false);
                }
            );
        } else {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
        }
    }, [query]);

    return (
        <div className="explore-page">
            <DashboardNavbar />
            <div className="explore-content">
                <header className="explore-header">
                    <h1>Explore: <span>{query}</span></h1>
                    <p>Discover top-rated spots near you.</p>
                    <h6>Note:- Click the card to get directions</h6>
                </header>

                {loading && <p className="loading-message">Searching for the best places...</p>}
                {error && <p className="error-message">{error}</p>}

                {!loading && !error && (
                    <div className="places-grid">
                        {places.length > 0 ? (
                            places.map((place) => <PlaceCard place={place} key={place.place_id} />)
                        ) : (
                            <p className="no-results">No places found for your search.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}