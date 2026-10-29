import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  VscAccount,
  VscArrowLeft,
  VscCheck,
  VscCopy,
  VscOrganization,
  VscPerson,
  VscTrash,
  VscWarning,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import { Alert, Badge, Button, Loading, Modal } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import './TripMembersManage.css';

export default function TripMembersManage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Demographic details form
  const [ageGroup, setAgeGroup] = useState('18-35');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [relation, setRelation] = useState('Friend');
  const [savingDemographics, setSavingDemographics] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/trips/${id}`);
      const tripData = res?.data?.data?.trip || res?.data?.data || null;
      setTrip(tripData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load members roster.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const members = trip?.group?.members || [];
  const isOwner = trip?.user === user?._id || trip?.createdBy === user?._id;

  const handleGenerateInvite = async () => {
    try {
      setGeneratingInvite(true);
      setInviteModalOpen(true);
      setCopied(false);
      const res = await api.post(`/trips/${id}/generate-invite`);
      const token = res?.data?.data?.token;
      setInviteToken(token);
      const origin = window.location.origin;
      setInviteUrl(`${origin}/invite/trip/${token}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not generate invite link.');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await api.patch(`/trips/${id}/members/${memberId}/role`, { role: newRole });
      setBanner({ type: 'success', text: `Role updated to ${newRole}.` });
      fetchTrip();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update role.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the trip?')) return;
    try {
      await api.delete(`/trips/${id}/members/${memberId}`);
      setBanner({ type: 'success', text: 'Member removed from squad.' });
      fetchTrip();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove member.');
    }
  };

  const handleSaveDemographics = async (e) => {
    e.preventDefault();
    try {
      setSavingDemographics(true);
      await api.patch(`/trips/${id}/members/me`, {
        ageGroup,
        gender,
        relation,
      });
      setBanner({
        type: 'success',
        text: 'Your demographic profile has been updated for NATPAC research data.',
      });
      fetchTrip();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Could not update demographic details. Please ensure demographic data consent is granted in Settings.'
      );
    } finally {
      setSavingDemographics(false);
    }
  };

  if (loading) {
    return (
      <div className="members-mgt-page">
        <DashboardNavbar />
        <div className="members-mgt-loading">
          <Loading size="lg" />
          <p>Accessing squad roster and permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="members-mgt-page">
      <DashboardNavbar />

      <div className="members-mgt-ambient" aria-hidden="true">
        <div className="members-mgt-orb members-mgt-orb-1" />
        <div className="members-mgt-orb members-mgt-orb-2" />
      </div>

      <main className="members-mgt-shell">
        <div className="members-mgt-top-nav">
          <Link to={`/trip/${id}`} className="members-mgt-back-link">
            <VscArrowLeft /> Back to {trip?.destination || 'Trip'} Overview
          </Link>
        </div>

        <TripSubNav />

        <header className="members-mgt-header">
          <div>
            <div className="members-mgt-eyebrow">
              <span className="members-mgt-live-dot" />
              <span>Expedition Squad</span>
            </div>
            <h1>Co-Travelers & Member Roles</h1>
            <p>
              Manage shared access, roles (Editors & Viewers), and submit NATPAC demographic telemetry for {trip?.destination || 'this expedition'}.
            </p>
          </div>

          <div className="members-mgt-header-actions">
            <Button
              variant="primary"
              icon={VscOrganization}
              onClick={handleGenerateInvite}
            >
              + Invite Co-Traveler
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {banner && (
          <Alert variant={banner.type} closable onClose={() => setBanner(null)}>
            {banner.text}
          </Alert>
        )}

        <div className="members-mgt-grid">
          {/* Left Column: Member Roster */}
          <section className="members-roster-card">
            <h2>Registered Squad Members ({members.length || 1})</h2>
            <div className="members-list">
              {members.length === 0 ? (
                <div className="member-row">
                  <div className="member-avatar">
                    <VscPerson />
                  </div>
                  <div className="member-info">
                    <h4>{user?.name || 'You (Trip Creator)'}</h4>
                    <span className="member-email">{user?.email}</span>
                  </div>
                  <Badge variant="success" size="sm">
                    Owner
                  </Badge>
                </div>
              ) : (
                members.map((member, idx) => {
                  const memberId = member.userId?._id || member.userId;
                  const isCurrentUser = memberId === user?._id;

                  return (
                    <article key={idx} className="member-row">
                      <div className="member-avatar">
                        <VscPerson />
                      </div>
                      <div className="member-info">
                        <h4>
                          {member.userId?.name || `Member #${idx + 1}`}
                          {isCurrentUser && ' (You)'}
                        </h4>
                        <span className="member-email">{member.userId?.email || 'Registered Traveler'}</span>
                        {member.relation && (
                          <span className="member-relation">Relation: {member.relation}</span>
                        )}
                      </div>

                      <div className="member-actions">
                        {isOwner && !isCurrentUser ? (
                          <select
                            value={member.role || 'viewer'}
                            onChange={(e) => handleUpdateRole(memberId, e.target.value)}
                            className="role-select"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <Badge variant="secondary" size="sm">
                            {member.role || 'Member'}
                          </Badge>
                        )}

                        {isOwner && !isCurrentUser && (
                          <button
                            type="button"
                            className="member-remove-btn"
                            onClick={() => handleRemoveMember(memberId)}
                            aria-label="Remove member"
                          >
                            <VscTrash />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Demographic Profile Form */}
          <section className="members-demographics-card">
            <h2>NATPAC Demographic Data</h2>
            <p className="demographics-note">
              WayMate is partnered with NATPAC to collect anonymized demographic trip patterns to optimize transit planning.
            </p>

            <form onSubmit={handleSaveDemographics} className="demographics-form">
              <div className="form-group">
                <label htmlFor="memberAgeGroup">Age Group</label>
                <select
                  id="memberAgeGroup"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                >
                  <option value="<18">&lt; 18 years</option>
                  <option value="18-35">18 - 35 years</option>
                  <option value="36-60">36 - 60 years</option>
                  <option value=">60">&gt; 60 years</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="memberGender">Gender</label>
                <select
                  id="memberGender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="memberRelation">Relation to Head / Host</label>
                <input
                  id="memberRelation"
                  type="text"
                  placeholder="e.g. Self, Spouse, Child, Colleague"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={savingDemographics}
              >
                Update Demographic Profile
              </Button>
            </form>
          </section>
        </div>

        {/* Invite Co-Traveler Modal */}
        {inviteModalOpen && (
          <Modal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            title="Invite Co-Travelers to Expedition"
          >
            <div className="invite-modal-body">
              <p>
                Anyone with this link can join <strong>{trip?.destination}</strong> as a co-traveler and synchronize itineraries.
              </p>

              {generatingInvite ? (
                <div className="invite-loading">
                  <Loading size="md" />
                  <p>Generating cryptographic invitation token...</p>
                </div>
              ) : (
                <div className="invite-link-row">
                  <input type="text" readOnly value={inviteUrl} />
                  <Button variant="primary" icon={copied ? VscCheck : VscCopy} onClick={handleCopyLink}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              )}
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
