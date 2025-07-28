import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { VscArrowLeft, VscSave } from "react-icons/vsc";
import { VscLoading,VscTrash } from "react-icons/vsc";
import './EditTrip.css'; // We will create this CSS file next

const COLORS = {
    primary: '#edafb8',
    secondary: '#f7e1d7',
    background: '#dedbd2',
    text: '#4a5759',
};

const StatusSelector = ({ currentStatus, onChange }) => {
    const statuses = ['planned', 'ongoing', 'completed', 'canceled'];
    return (
        <div className="status-selector">
            {statuses.map(status => (
                <button
                    key={status}
                    type="button"
                    className={`status-option ${currentStatus === status ? 'active' : ''}`}
                    onClick={() => onChange(status)}
                >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
            ))}
        </div>
    );
};

export default function EditTrip() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation('tripDetails');

    const [trip, setTrip] = useState(null);
    const [formData, setFormData] = useState({
        destination: '',
        startDate: '',
        endDate: '',
        travelers: 1,
        accommodationType: '',
        status: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteTrip = async () => {
        if (window.confirm("Are you sure you want to permanently delete this trip? This action cannot be undone.")) {
            setIsDeleting(true);
            setMessage('');
            try {
                await api.delete(`/trips/${id}`);
                setMessage('✅ Trip deleted successfully. Redirecting...');
                setTimeout(() => navigate('/dashboard'), 1500);
            } catch (error) {
                setMessage(error.response?.data?.message || 'Failed to delete trip.');
                setIsDeleting(false);
            }
        }
    };



    const fetchTripData = useCallback(async () => {
        try {
            const response = await api.get(`/trips/${id}`);
            const tripData = response.data.data.trip;
            setTrip(tripData);
            setFormData({
                destination: tripData.destination,
                startDate: new Date(tripData.startDate).toISOString().split('T')[0],
                endDate: new Date(tripData.endDate).toISOString().split('T')[0],
                travelers: tripData.travelers,
                accommodationType: tripData.preferences.accommodationType || 'standard'
            });
        } catch (error) {
            setMessage('Failed to load trip data.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTripData();
    }, [fetchTripData]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleStatusChange = (newStatus) => {
        setFormData(prev => ({ ...prev, status: newStatus }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');
        try {
            const payload = {
                destination: formData.destination,
                startDate: formData.startDate,
                endDate: formData.endDate,
                travelers: Number(formData.travelers),
                status: formData.status, // Include status in the payload
                preferences: {
                    ...trip.preferences,
                    accommodationType: formData.accommodationType
                }
            };
            await api.patch(`/trips/${id}/details`, payload);
            setMessage('✅ Trip updated successfully!');
            setTimeout(() => navigate(`/trip/${id}`), 1500);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Failed to update trip.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-screen">Loading editor...</div>;

    return (
        <div className="edit-trip-page">
            <nav className="edit-trip-nav">
                <Link to={`/trip/${id}`} className="nav-back-button">
                    <VscArrowLeft /> Back to Trip
                </Link>
                <h1 className="edit-trip-title">Edit Trip to {trip?.destination}</h1>
                <button form="edit-trip-form" type="submit" className="save-button-nav" disabled={isSaving}>
                    {isSaving ? <VscLoading className="spinner" /> : <VscSave />}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </nav>
            <div className="edit-trip-container">
                <form id="edit-trip-form" onSubmit={handleSubmit} className="edit-trip-form">
                    <div className="form-column">
                        <div className="form-group">
                            <label htmlFor="destination">Destination</label>
                            <input type="text" id="destination" name="destination" value={formData.destination} onChange={handleChange} required disabled />
                        </div>
                        <div className="form-group">
                            <label htmlFor="startDate">Start Date</label>
                            <input type="date" id="startDate" name="startDate" value={formData.startDate} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="endDate">End Date</label>
                            <input type="date" id="endDate" name="endDate" value={formData.endDate} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-column">
                        <div className="form-group">
                            <label>Trip Status</label>
                            <StatusSelector currentStatus={formData.status} onChange={handleStatusChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="travelers">Travelers</label>
                            <input type="number" id="travelers" name="travelers" value={formData.travelers} onChange={handleChange} min="1" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="accommodationType">Accommodation Style</label>
                            <select id="accommodationType" name="accommodationType" value={formData.accommodationType} onChange={handleChange}>
                                <option value="budget">Budget</option>
                                <option value="standard">Standard</option>
                                <option value="luxury">Luxury</option>
                            </select>
                        </div>
                    </div>
                </form>
                {message && <p className="form-message-footer">{message}</p>}
                <h6>
                    Please note: While core trip details can be modified, the AI-generated itinerary will not be updated automatically. To ensure efficient data management, completed trips are archived one week after their end date.
                </h6>
                <div className="danger-zone">
                    <div className="danger-zone-header">
                        <h4>Danger Zone</h4>
                        <p>These actions are permanent and cannot be undone.</p>
                    </div>
                    <button
                        type="button"
                        className="delete-button"
                        onClick={handleDeleteTrip}
                        disabled={isDeleting}
                    >
                        <VscTrash /> {isDeleting ? 'Deleting...' : 'Delete This Trip'}
                    </button>
                </div>
            </div>
        </div>
    );
}