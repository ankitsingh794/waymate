/**
 * Households Page
 * Manage family/group households and members
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import {
  VscHome,
  VscPerson,
  VscAdd,
  VscCopy,
  VscTrash,
  VscEdit,
  VscArrowRight,
} from 'react-icons/vsc';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Alert, Badge } from '../../components/UI';
import DashboardNavbar from '../../components/DashboardNavbar';
import './HouseholdsPage.css';

export default function HouseholdsPage() {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteLink, setInviteLink] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchHousehold();
  }, []);

  const fetchHousehold = async () => {
    try {
      setLoading(true);
      const response = await api.get('/households/my-household');
      setHousehold(response.data.household);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load household');
      }
    } finally {
      setLoading(false);
    }
  };

  const createHousehold = async () => {
    if (!householdName.trim()) {
      setError('Household name is required');
      return;
    }

    try {
      const response = await api.post('/households', {
        householdName: householdName.trim(),
      });
      setHousehold(response.data.household);
      setHouseholdName('');
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create household');
    }
  };

  const generateInvite = async () => {
    try {
      const response = await api.post(`/households/${household._id}/generate-invite`);
      setInviteLink(response.data.inviteLink);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invite link');
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/households/${household._id}/members/${memberId}`);
      setHousehold(prev => ({
        ...prev,
        members: prev.members.filter(m => m.userId._id !== memberId),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const leaveHousehold = async () => {
    if (!window.confirm('Are you sure you want to leave this household?')) return;

    try {
      await api.post(`/households/${household._id}/leave`);
      setHousehold(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave household');
    }
  };

  return (
    <div className="households-page">
      <DashboardNavbar />

      <div className="households-body">
        <div className="page-header">
          <h1>Households</h1>
          <p>Manage your family or group travel</p>
        </div>

        {error && <Alert variant="error" closable onClose={() => setError(null)}>{error}</Alert>}

        <div className="households-container">
          {loading ? (
            <Card padding="lg">
              <p style={{ textAlign: 'center' }}>Loading...</p>
            </Card>
          ) : household ? (
            <>
              {/* Current Household */}
              <Card padding="lg" className="household-card">
                <CardHeader title={household.householdName} subtitle="Your current household" />
                <CardBody>
                  <div className="household-stats">
                    <div className="stat">
                      <strong>{household.members.length}</strong>
                      <span>Members</span>
                    </div>
                    <div className="stat">
                      <strong>{household.tripIds?.length || 0}</strong>
                      <span>Trips</span>
                    </div>
                  </div>

                  <div className="members-section">
                    <h3>Members</h3>
                    <ul className="members-list">
                      {household.members.map(member => (
                        <li key={member.userId._id} className="member-item">
                          <div className="member-info">
                            <VscPerson className="member-icon" />
                            <div>
                              <strong>{member.userId.name}</strong>
                              <span>{member.userId.email}</span>
                            </div>
                            <Badge variant="primary" size="sm">
                              {member.role === 'head' ? 'Head' : 'Member'}
                            </Badge>
                          </div>
                          {household.head === user?._id && member.userId._id !== user._id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={VscTrash}
                              onClick={() => removeMember(member.userId._id)}
                              style={{ color: 'var(--color-error)' }}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {household.head === user?._id && (
                    <div className="invite-section">
                      <h3>Invite Members</h3>
                      {inviteLink ? (
                        <div className="invite-link-box">
                          <Input
                            value={inviteLink}
                            readOnly
                            icon={VscCopy}
                            iconPosition="right"
                          />
                          <Button onClick={copyInviteLink} variant="secondary">
                            {copySuccess ? 'Copied!' : 'Copy Link'}
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={generateInvite} variant="secondary" icon={VscAdd}>
                          Generate Invite Link
                        </Button>
                      )}
                    </div>
                  )}
                </CardBody>
                <CardFooter>
                  {household.head !== user?._id && (
                    <Button variant="error" onClick={leaveHousehold}>
                      Leave Household
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </>
          ) : (
            <>
              {/* No Household */}
              <Card padding="lg" className="empty-household">
                <div className="empty-content">
                  <VscHome className="empty-icon" />
                  <h2>No Household Yet</h2>
                  <p>Create or join a household to plan trips with your family or group</p>
                  <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    variant="primary"
                    icon={VscAdd}
                  >
                    Create Household
                  </Button>
                </div>
              </Card>

              {showCreateForm && (
                <Card padding="lg">
                  <CardHeader title="Create New Household" />
                  <CardBody>
                    <Input
                      label="Household Name"
                      placeholder="e.g., Johnson Family, Weekend Warriors"
                      value={householdName}
                      onChange={e => setHouseholdName(e.target.value)}
                      fullWidth
                    />
                  </CardBody>
                  <CardFooter>
                    <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={createHousehold}>
                      Create
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
