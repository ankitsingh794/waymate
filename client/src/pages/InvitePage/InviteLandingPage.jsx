import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  VscCheck,
  VscCompass,
  VscHome,
  VscOrganization,
  VscWarning,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Button, Loading } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './InviteLandingPage.css';

export default function InviteLandingPage() {
  const { type, token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isTrip = type === 'trip';

  const handleAcceptInvite = async () => {
    try {
      setLoading(true);
      setError('');

      if (isTrip) {
        const res = await api.post('/trips/accept-invite', { token });
        const tripId = res?.data?.data?.tripId || res?.data?.data?._id;
        setSuccess('Successfully joined the expedition squad! Redirecting...');
        setTimeout(() => {
          navigate(tripId ? `/trip/${tripId}` : '/trips');
        }, 1500);
      } else {
        await api.post('/households/accept-invite', { token });
        setSuccess('Successfully linked to household! Redirecting...');
        setTimeout(() => {
          navigate('/households');
        }, 1500);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Could not accept invitation. The link may have expired or already been used.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invite-landing-page">
      <DashboardNavbar />

      <div className="invite-ambient" aria-hidden="true">
        <div className="invite-orb invite-orb-1" />
        <div className="invite-orb invite-orb-2" />
      </div>

      <main className="invite-shell">
        <div className="invite-card">
          <div className="invite-badge-icon">
            {isTrip ? <VscCompass /> : <VscHome />}
          </div>

          <div className="invite-header-copy">
            <span className="invite-tag">
              {isTrip ? 'Expedition Invitation' : 'Household Transport Link'}
            </span>
            <h1>You have been invited to collaborate!</h1>
            <p>
              {isTrip
                ? 'Join this shared travel itinerary to synchronize schedules, coordinate group expenses, and share route media.'
                : 'Join this household mobility group to share vehicle telemetry and complete collective commuter research surveys.'}
            </p>
          </div>

          {error && (
            <Alert variant="error" closable onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && <Alert variant="success">{success}</Alert>}

          <div className="invite-token-preview">
            <span className="token-label">Cryptographic Invite Token:</span>
            <code>{token ? `${token.substring(0, 16)}...` : 'Valid Token'}</code>
          </div>

          <div className="invite-actions">
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => navigate('/dashboard')}
            >
              Decline & Return
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={loading}
              onClick={handleAcceptInvite}
            >
              {isTrip ? 'Accept & Join Expedition' : 'Accept & Join Household'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
