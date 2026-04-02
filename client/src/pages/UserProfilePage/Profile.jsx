import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  VscAccount,
  VscArrowLeft,
  VscBell,
  VscCheck,
  VscCloudUpload,
  VscError,
  VscGlobe,
  VscInfo,
  VscKey,
  VscLoading,
  VscSettingsGear,
  VscSignOut,
} from 'react-icons/vsc';
import api from '../../utils/axiosInstance';
import { Toast } from '../../components/UI';
import './Profile.css';

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'bn', name: 'Bangla' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'hi', name: 'Hindi' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
];

const CURRENCY_OPTIONS = [
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
];

function extractUser(payload) {
  return payload?.data?.user || payload?.data || payload?.user || null;
}

function getInitials(name, email) {
  const text = (name || email || 'U').trim();
  if (!text) return 'U';

  const parts = text.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function UserProfile() {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const navigate = useNavigate();
  const photoInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [feedback, setFeedback] = useState({ type: 'info', text: '' });

  const [profileForm, setProfileForm] = useState({
    name: '',
    city: '',
    country: '',
  });
  const [preferencesForm, setPreferencesForm] = useState({
    language: 'en',
    currency: 'INR',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [busy, setBusy] = useState({
    savingProfile: false,
    savingPreferences: false,
    savingPassword: false,
    uploadingPhoto: false,
    loggingOut: false,
  });

  const hydrateFromUser = useCallback((nextUser) => {
    if (!nextUser) return;

    setUser(nextUser);
    setProfileForm({
      name: nextUser.name || '',
      city: nextUser.location?.city || '',
      country: nextUser.location?.country || '',
    });

    setPreferencesForm({
      language: nextUser.preferences?.language || i18n.language || 'en',
      currency: nextUser.preferences?.currency || 'INR',
    });
  }, [i18n.language]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const { data } = await api.get('/users/profile');
      const fetchedUser = extractUser(data);

      if (!fetchedUser) {
        throw new Error('Profile data is unavailable.');
      }

      hydrateFromUser(fetchedUser);
    } catch (profileError) {
      setPageError(profileError?.response?.data?.message || 'Could not load profile right now.');
    } finally {
      setLoading(false);
    }
  }, [hydrateFromUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!feedback.text) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFeedback((prev) => ({ ...prev, text: '' }));
    }, 3800);

    return () => window.clearTimeout(timeoutId);
  }, [feedback.text]);

  const avatarText = useMemo(() => getInitials(user?.name, user?.email), [user?.name, user?.email]);

  const handleProfileFormChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (event) => {
    const { name, value } = event.target;
    setPreferencesForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    setBusy((prev) => ({ ...prev, savingProfile: true }));
    try {
      const payload = {
        name: profileForm.name.trim(),
        location: {
          city: profileForm.city.trim(),
          country: profileForm.country.trim(),
        },
      };

      const { data } = await api.patch('/users/profile', payload);
      const updatedUser = extractUser(data);

      if (updatedUser) {
        hydrateFromUser(updatedUser);
      }

      setFeedback({ type: 'success', text: t('profile:alerts.profileUpdated', { defaultValue: 'Profile updated.' }) });
    } catch (saveError) {
      setFeedback({
        type: 'error',
        text: saveError?.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setBusy((prev) => ({ ...prev, savingProfile: false }));
    }
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();

    setBusy((prev) => ({ ...prev, savingPreferences: true }));
    try {
      const payload = {
        preferences: {
          language: preferencesForm.language,
          currency: preferencesForm.currency,
        },
      };

      const { data } = await api.patch('/users/profile', payload);
      const updatedUser = extractUser(data);

      if (updatedUser) {
        hydrateFromUser(updatedUser);
      }

      i18n.changeLanguage(preferencesForm.language);
      setFeedback({ type: 'success', text: t('profile:alerts.preferencesSaved', { defaultValue: 'Preferences saved.' }) });
    } catch (saveError) {
      setFeedback({
        type: 'error',
        text: saveError?.response?.data?.message || 'Failed to save preferences.',
      });
    } finally {
      setBusy((prev) => ({ ...prev, savingPreferences: false }));
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedback({
        type: 'error',
        text: t('profile:alerts.passwordsNoMatch', { defaultValue: 'New passwords do not match.' }),
      });
      return;
    }

    setBusy((prev) => ({ ...prev, savingPassword: true }));
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setFeedback({
        type: 'success',
        text: t('profile:alerts.passwordUpdated', { defaultValue: 'Password updated successfully.' }),
      });
    } catch (saveError) {
      setFeedback({
        type: 'error',
        text: saveError?.response?.data?.message || 'Failed to update password.',
      });
    } finally {
      setBusy((prev) => ({ ...prev, savingPassword: false }));
    }
  };

  const handlePhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy((prev) => ({ ...prev, uploadingPhoto: true }));

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const { data } = await api.patch('/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = extractUser(data);
      if (updatedUser) {
        hydrateFromUser(updatedUser);
      }

      setFeedback({ type: 'success', text: 'Profile photo updated successfully.' });
    } catch (uploadError) {
      setFeedback({
        type: 'error',
        text: uploadError?.response?.data?.message || 'Failed to upload profile photo.',
      });
    } finally {
      event.target.value = '';
      setBusy((prev) => ({ ...prev, uploadingPhoto: false }));
    }
  };

  const handleLogout = async () => {
    setBusy((prev) => ({ ...prev, loggingOut: true }));

    try {
      await api.post('/auth/logout');
    } catch {
      // continue with local cleanup even if API logout fails
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <VscLoading className="spin" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (pageError || !user) {
    return (
      <div className="profile-error">
        <VscError />
        <h2>{pageError || 'Profile is unavailable.'}</h2>
        <div className="profile-error-actions">
          <button type="button" onClick={fetchProfile}>
            Retry
          </button>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-hero">
        <div className="profile-hero-top">
          <Link to="/dashboard" className="profile-back-link">
            <VscArrowLeft />
            <span>Back to dashboard</span>
          </Link>

          <Link to="/notifications" className="profile-notification-link" aria-label="Open notifications">
            <VscBell />
          </Link>
        </div>

        <div className="profile-identity">
          <div className="profile-avatar-wrap">
            {user.profileImage ? (
              <img src={user.profileImage} alt={t('profile:userAvatarAlt')} className="profile-avatar" loading="lazy" decoding="async" />
            ) : (
              <div className="profile-avatar-fallback">{avatarText}</div>
            )}

            <button
              type="button"
              className="profile-photo-btn"
              onClick={() => photoInputRef.current?.click()}
              disabled={busy.uploadingPhoto}
            >
              {busy.uploadingPhoto ? <VscLoading className="spin" /> : <VscCloudUpload />} Photo
            </button>

            <input
              ref={photoInputRef}
              className="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
            />
          </div>

          <div>
            <p className="profile-overline">Personal Workspace</p>
            <h1>{user.name || 'User'}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
      </header>

      <Toast
        variant={feedback.type}
        message={feedback.text}
        onClose={() => setFeedback((prev) => ({ ...prev, text: '' }))}
      />

      <main className="profile-layout">
        <section className="profile-main-column">
          <article className="profile-card">
            <div className="profile-card-head">
              <h2>
                <VscAccount /> Public Profile
              </h2>
              <p>Update your name and basic location details used across your trips.</p>
            </div>

            <form className="profile-form-grid" onSubmit={handleSaveProfile}>
              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileFormChange}
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label>
                Email
                <input type="email" value={user.email || ''} disabled />
              </label>

              <label>
                City
                <input
                  type="text"
                  name="city"
                  value={profileForm.city}
                  onChange={handleProfileFormChange}
                  placeholder="City"
                />
              </label>

              <label>
                Country
                <input
                  type="text"
                  name="country"
                  value={profileForm.country}
                  onChange={handleProfileFormChange}
                  placeholder="Country"
                />
              </label>

              <div className="profile-form-actions full-width">
                <button type="submit" className="profile-btn primary" disabled={busy.savingProfile}>
                  {busy.savingProfile ? <VscLoading className="spin" /> : <VscCheck />} Save Profile
                </button>
              </div>
            </form>
          </article>

          <article className="profile-card">
            <div className="profile-card-head">
              <h2>
                <VscGlobe /> Preferences
              </h2>
              <p>Choose language and currency defaults for planning and reporting.</p>
            </div>

            <form className="profile-form-grid" onSubmit={handleSavePreferences}>
              <label>
                Language
                <select name="language" value={preferencesForm.language} onChange={handlePreferenceChange}>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Currency
                <select name="currency" value={preferencesForm.currency} onChange={handlePreferenceChange}>
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code} - {option.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="profile-form-actions full-width">
                <button type="submit" className="profile-btn primary" disabled={busy.savingPreferences}>
                  {busy.savingPreferences ? <VscLoading className="spin" /> : <VscCheck />} Save Preferences
                </button>
              </div>
            </form>
          </article>
        </section>

        <aside className="profile-side-column">
          <article className="profile-card">
            <div className="profile-card-head">
              <h2>
                <VscKey /> Password and Security
              </h2>
              <p>Use a strong password to keep your account safe.</p>
            </div>

            <form className="profile-form-grid" onSubmit={handleSavePassword}>
              <label className="full-width">
                Current Password
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  required
                />
              </label>

              <label>
                New Password
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </label>

              <div className="profile-form-actions full-width">
                <button type="submit" className="profile-btn primary" disabled={busy.savingPassword}>
                  {busy.savingPassword ? <VscLoading className="spin" /> : <VscCheck />} Update Password
                </button>
              </div>
            </form>
          </article>

          <article className="profile-card profile-card-warning">
            <div className="profile-card-head">
              <h2>
                <VscSignOut /> Session Control
              </h2>
              <p>Sign out safely from your current session on this device.</p>
            </div>

            <button type="button" className="profile-btn danger" onClick={handleLogout} disabled={busy.loggingOut}>
              {busy.loggingOut ? <VscLoading className="spin" /> : <VscSignOut />} Logout
            </button>

            <small>
              <VscInfo /> You can sign in again anytime with your email and password.
            </small>
          </article>
        </aside>
      </main>
    </div>
  );
}
