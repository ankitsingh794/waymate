import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import DashboardNavbar from '../../components/DashboardNavbar';
import './ExplorePage.css';



const PlaceCard = ({ place }) => {
    const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}&destination_place_id=${place.place_id}`;
    const imageUrl = place.imageUrl || `https://placehold.co/400x300/f7e1d7/4a5759?text=${encodeURIComponent(place.name)}`; 

    return (
         <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="place-card-link">
            <div className="place-card">
                <img src={imageUrl} alt={place.name} className="place-card-image"  loading="lazy" decoding="async"/>
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
                    <h6>Note:- Click the card to get directions</h6>
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