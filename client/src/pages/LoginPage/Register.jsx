import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';
import './Register.css';

export default function Register() {
    const { t } = useTranslation('auth');
    const navigate = useNavigate();
    const { user } = useAuth();

    // Step state: 1 = Essentials, 2 = Profile & Mobility
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        // Step 1: Essentials
        name: '',
        email: '',
        password: '',
        role: 'user', // 'user' | 'researcher'

        // Step 2: Demographics & Mobility
        city: '',
        country: 'India',
        ageGroup: '18-35',
        gender: 'prefer_not_to_say',
        occupation: '',
        primaryMode: 'public_transport',

        // Privacy consents
        data_collection: true,
        demographic_data: true,
        passive_tracking: false,
    });

    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step1Errors, setStep1Errors] = useState({});

    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (step1Errors[name]) {
            setStep1Errors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateStep1 = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Full name is required';
        }
        if (!formData.email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please provide a valid email address';
        }
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        setStep1Errors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleContinueToStep2 = (e) => {
        e.preventDefault();
        setMessage('');
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleBackToStep1 = () => {
        setMessage('');
        setStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsSuccess(false);
        setIsSubmitting(true);

        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            role: formData.role,
            city: formData.city.trim(),
            country: formData.country.trim() || 'India',
            location: {
                city: formData.city.trim(),
                country: formData.country.trim() || 'India',
            },
            demographics: {
                ageGroup: formData.ageGroup,
                gender: formData.gender,
                occupation: formData.occupation.trim(),
            },
            preferences: {
                primaryMode: formData.primaryMode,
            },
            consents: {
                data_collection: formData.data_collection,
                demographic_data: formData.demographic_data,
                passive_tracking: formData.passive_tracking,
            },
        };

        try {
            await api.post('/auth/register', payload);
            setIsSuccess(true);
            setMessage('Registration successful! Please check your inbox to verify your email. Redirecting to login…');
            setTimeout(() => navigate('/login'), 3500);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Something went wrong during registration. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            headline={
                <>
                    Smarter journeys.<br />
                    <em>Demographic precision.</em><br />
                    Atelier aesthetics.
                </>
            }
            subline="Join thousands of mindful travelers and transit researchers shaping smarter cities."
        >
            <div className="auth-form-card register-form-card">
                {/* Header */}
                <div className="auth-form-header">
                    <div className="register-stepper-bar">
                        <div className={`register-step-pill ${step === 1 ? 'is-active' : 'is-completed'}`}>
                            <span className="step-num">{step > 1 ? '✓' : '1'}</span>
                            <span className="step-label">Account</span>
                        </div>
                        <div className="register-step-connector" />
                        <div className={`register-step-pill ${step === 2 ? 'is-active' : ''}`}>
                            <span className="step-num">2</span>
                            <span className="step-label">Mobility & Profile</span>
                        </div>
                    </div>

                    <h1 className="auth-form-title">
                        {step === 1 ? t('register.title', 'Create Your Account') : t('register.step2Title', 'Mobility & Demographics')}
                    </h1>
                    <p className="auth-form-subtitle">
                        {step === 1 ? (
                            <>
                                Already have an account?{' '}
                                <Link to="/login">{t('register.loginLink', 'Login')}</Link>
                            </>
                        ) : (
                            'Contribute your mobility profile to customize AI routes and support transit equity.'
                        )}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={step === 1 ? handleContinueToStep2 : handleSubmit} noValidate>
                    {step === 1 && (
                        <div className="register-fields-stack">
                            {/* Role selector */}
                            <div className="auth-field">
                                <label className="auth-field-label">Account Role</label>
                                <div className="register-role-toggle">
                                    <button
                                        type="button"
                                        className={`role-toggle-option ${formData.role === 'user' ? 'is-selected' : ''}`}
                                        onClick={() => setFormData({ ...formData, role: 'user' })}
                                    >
                                        <div className="role-option-title">🧭 Explorer / Traveler</div>
                                        <div className="role-option-desc">Plan journeys, manage trips, track expenses</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-toggle-option ${formData.role === 'researcher' ? 'is-selected' : ''}`}
                                        onClick={() => setFormData({ ...formData, role: 'researcher' })}
                                    >
                                        <div className="role-option-title">🔬 Transit Researcher</div>
                                        <div className="role-option-desc">Analyze urban mobility, NATPAC modeling</div>
                                    </button>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="auth-field">
                                <label htmlFor="reg-name" className="auth-field-label">
                                    {t('register.nameLabel', 'Full Name')} <span className="field-required">*</span>
                                </label>
                                <input
                                    id="reg-name"
                                    name="name"
                                    type="text"
                                    className={`auth-field-input ${step1Errors.name ? 'is-error' : ''}`}
                                    placeholder="e.g. Maya Sen"
                                    autoComplete="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                                {step1Errors.name && (
                                    <span className="auth-field-error">{step1Errors.name}</span>
                                )}
                            </div>

                            {/* Email */}
                            <div className="auth-field">
                                <label htmlFor="reg-email" className="auth-field-label">
                                    {t('register.emailLabel', 'Email Address')} <span className="field-required">*</span>
                                </label>
                                <input
                                    id="reg-email"
                                    name="email"
                                    type="email"
                                    className={`auth-field-input ${step1Errors.email ? 'is-error' : ''}`}
                                    placeholder="maya@example.com"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                {step1Errors.email && (
                                    <span className="auth-field-error">{step1Errors.email}</span>
                                )}
                            </div>

                            {/* Password */}
                            <div className="auth-field">
                                <label htmlFor="reg-password" className="auth-field-label">
                                    {t('register.passwordLabel', 'Password')} <span className="field-required">*</span>
                                </label>
                                <input
                                    id="reg-password"
                                    name="password"
                                    type="password"
                                    className={`auth-field-input ${step1Errors.password ? 'is-error' : ''}`}
                                    placeholder="Minimum 8 characters"
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                {step1Errors.password && (
                                    <span className="auth-field-error">{step1Errors.password}</span>
                                )}
                            </div>

                            {message && (
                                <p className={`auth-message ${isSuccess ? 'is-success' : 'is-error'}`} role="alert">
                                    {message}
                                </p>
                            )}

                            <button type="submit" className="auth-submit-btn">
                                <span>{t('register.continueButton', 'Continue to Mobility Profile')}</span>
                                <span aria-hidden="true">→</span>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="register-fields-stack">
                            {/* Location Grid: City + Country */}
                            <div className="register-grid-2">
                                <div className="auth-field">
                                    <label htmlFor="reg-city" className="auth-field-label">
                                        Primary City
                                    </label>
                                    <input
                                        id="reg-city"
                                        name="city"
                                        type="text"
                                        className="auth-field-input"
                                        placeholder="e.g. Kochi, Bengaluru"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="reg-country" className="auth-field-label">
                                        Country
                                    </label>
                                    <input
                                        id="reg-country"
                                        name="country"
                                        type="text"
                                        className="auth-field-input"
                                        placeholder="e.g. India"
                                        value={formData.country}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Demographics Grid: Age Group + Gender */}
                            <div className="register-grid-2">
                                <div className="auth-field">
                                    <label htmlFor="reg-ageGroup" className="auth-field-label">
                                        Age Group
                                    </label>
                                    <select
                                        id="reg-ageGroup"
                                        name="ageGroup"
                                        className="auth-field-select"
                                        value={formData.ageGroup}
                                        onChange={handleChange}
                                    >
                                        <option value="<18">&lt; 18 years</option>
                                        <option value="18-35">18 - 35 years</option>
                                        <option value="36-60">36 - 60 years</option>
                                        <option value=">60">&gt; 60 years</option>
                                        <option value="prefer_not_to_say">Prefer not to say</option>
                                    </select>
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="reg-gender" className="auth-field-label">
                                        Gender
                                    </label>
                                    <select
                                        id="reg-gender"
                                        name="gender"
                                        className="auth-field-select"
                                        value={formData.gender}
                                        onChange={handleChange}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other / Non-binary</option>
                                        <option value="prefer_not_to_say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            {/* Occupation & Primary Commute Mode */}
                            <div className="register-grid-2">
                                <div className="auth-field">
                                    <label htmlFor="reg-occupation" className="auth-field-label">
                                        Occupation
                                    </label>
                                    <input
                                        id="reg-occupation"
                                        name="occupation"
                                        type="text"
                                        className="auth-field-input"
                                        placeholder="e.g. Software Engineer, Student"
                                        value={formData.occupation}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="reg-primaryMode" className="auth-field-label">
                                        Primary Commute Mode
                                    </label>
                                    <select
                                        id="reg-primaryMode"
                                        name="primaryMode"
                                        className="auth-field-select"
                                        value={formData.primaryMode}
                                        onChange={handleChange}
                                    >
                                        <option value="public_transport">🚇 Public Transit (Bus/Metro/Rail)</option>
                                        <option value="private_car">🚗 Personal Car</option>
                                        <option value="private_bike">🛵 Two-Wheeler / Motorcycle</option>
                                        <option value="walk_cycle">🚲 Walking & Cycling</option>
                                        <option value="other">Other Mobility</option>
                                    </select>
                                </div>
                            </div>

                            {/* Consent Checkboxes */}
                            <div className="register-consents-box">
                                <div className="register-consents-header">
                                    <span className="consents-badge">Privacy & Citizen Science</span>
                                    <span className="consents-subtext">Manage your permissions for trip telemetry</span>
                                </div>

                                <label className="consent-checkbox-row">
                                    <input
                                        type="checkbox"
                                        name="data_collection"
                                        checked={formData.data_collection}
                                        onChange={handleChange}
                                        className="consent-checkbox"
                                    />
                                    <div className="consent-text-block">
                                        <div className="consent-title">
                                            <span>Trip & Transit Synchronization</span>
                                            <span className="consent-required-badge">Essential</span>
                                        </div>
                                        <div className="consent-desc">
                                            Record itinerary legs, route schedules, and expense ledgers.
                                        </div>
                                    </div>
                                </label>

                                <label className="consent-checkbox-row">
                                    <input
                                        type="checkbox"
                                        name="demographic_data"
                                        checked={formData.demographic_data}
                                        onChange={handleChange}
                                        className="consent-checkbox"
                                    />
                                    <div className="consent-text-block">
                                        <div className="consent-title">
                                            <span>NATPAC Mobility Intelligence</span>
                                            <span className="consent-optin-badge">Recommended</span>
                                        </div>
                                        <div className="consent-desc">
                                            Share anonymized demographic trip patterns to optimize public transit routes.
                                        </div>
                                    </div>
                                </label>

                                <label className="consent-checkbox-row">
                                    <input
                                        type="checkbox"
                                        name="passive_tracking"
                                        checked={formData.passive_tracking}
                                        onChange={handleChange}
                                        className="consent-checkbox"
                                    />
                                    <div className="consent-text-block">
                                        <div className="consent-title">
                                            <span>Passive Transfer Telemetry</span>
                                            <span className="consent-optin-badge">Optional</span>
                                        </div>
                                        <div className="consent-desc">
                                            Enable seamless background interchange alerts during active journeys.
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {message && (
                                <p className={`auth-message ${isSuccess ? 'is-success' : 'is-error'}`} role="alert">
                                    {message}
                                </p>
                            )}

                            {/* Dual action buttons */}
                            <div className="register-actions-row">
                                <button
                                    type="button"
                                    className="auth-secondary-btn"
                                    onClick={handleBackToStep1}
                                    disabled={isSubmitting || isSuccess}
                                >
                                    ← Back
                                </button>
                                <button
                                    type="submit"
                                    className="auth-submit-btn register-final-submit"
                                    disabled={isSubmitting || isSuccess}
                                >
                                    {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                                    <span>
                                        {isSubmitting
                                            ? 'Creating account…'
                                            : t('register.button', 'Complete Registration')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="auth-form-footer">
                    <p>
                        By continuing, you agree to WayMate's terms of service and NATPAC research privacy protocol.
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
