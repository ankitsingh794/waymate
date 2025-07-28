import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import DashboardNavbar from '../../components/DashboardNavbar';
import './ExplorePage.css';


const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const PlaceCard = ({ place }) => {
    const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}&destination_place_id=${place.place_id}`;
    const imageUrl = place.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photo_reference}&key=${GOOGLE_API_KEY}`
        : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'; 

    return (
         <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="place-card-link">
            <div className="place-card">
                <img src={imageUrl} alt={place.name} className="place-card-image" />
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
        const fetchPlaces = async () => {
            if (!query) {
                setLoading(false);
                setError('No search query provided.');
                return;
            }
            try {
                const response = await api.get(`/find-places?query=${encodeURIComponent(query)}`);
                setPlaces(response.data.data.places);
            } catch (err) {
                setError('Could not fetch results. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchPlaces();
    }, [query]);

    return (
        <div className="explore-page">
            <DashboardNavbar />
            <div className="explore-content">
                <header className="explore-header">
                    <h1>Explore: <span>{query}</span></h1>
                    <p>Discover top-rated spots near you.</p>
                </header>

                {loading && <p className="loading-message">Searching for the best places...</p>}
                {error && <p className="error-message">{error}</p>}
                
                {!loading && !error && (
                    <div className="places-grid">
                        {places.length > 0 ? (
                            places.map((place, index) => <PlaceCard place={place} key={index} />)
                        ) : (
                            <p className="no-results">No places found for your search.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}