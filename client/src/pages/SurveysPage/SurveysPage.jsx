/**
 * Surveys Page
 * User data and survey submission for research
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import { VscCheckAll, VscEdit } from 'react-icons/vsc';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Alert } from '../../components/UI';
import DashboardNavbar from '../../components/DashboardNavbar';
import './SurveysPage.css';

export default function SurveysPage() {
  const { user } = useAuth();
  const [surveyData, setSurveyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    householdIncome: '',
    vehicleCount: 0,
    primaryTransportModeToWork: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSurveyData();
  }, []);

  const fetchSurveyData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/surveys/my-data');
      setSurveyData(response.data.survey);
      if (response.data.survey) {
        setFormData({
          householdIncome: response.data.survey.householdIncome || '',
          vehicleCount: response.data.survey.vehicleCount || 0,
          primaryTransportModeToWork: response.data.survey.primaryTransportModeToWork || '',
        });
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load survey data');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSurveyData = async () => {
    try {
      setSaving(true);
      const response = await api.post('/api/v1/surveys/my-data', formData);
      setSurveyData(response.data.survey);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save survey data');
    } finally {
      setSaving(false);
    }
  };

  const incomeOptions = [
    '<25k',
    '25k-50k',
    '50k-100k',
    '100k-200k',
    '>200k',
    'prefer_not_to_say',
  ];

  const transportModes = [
    'private_car',
    'private_bike',
    'public_transport',
    'walk_cycle',
    'work_from_home',
    'other',
  ];

  const formatLabel = (text) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="surveys-page">
      <DashboardNavbar />

      <div className="surveys-body">
        <div className="page-header">
          <h1>Survey Data</h1>
          <p>Help us understand your travel patterns</p>
        </div>

        {error && <Alert variant="error" closable onClose={() => setError(null)}>{error}</Alert>}

        <div className="surveys-container">
          {loading ? (
            <Card padding="lg">
              <p style={{ textAlign: 'center' }}>Loading...</p>
            </Card>
          ) : (
            <Card padding="lg">
              <CardHeader
                title="Your Information"
                subtitle="This information helps us improve our service"
              />

              <CardBody>
                {surveyData && !editing ? (
                  <div className="survey-display">
                    <div className="survey-item">
                      <label>Household Income</label>
                      <p>{formatLabel(surveyData.householdIncome || 'Not provided')}</p>
                    </div>

                    <div className="survey-item">
                      <label>Vehicle Count</label>
                      <p>{surveyData.vehicleCount || 0} vehicles</p>
                    </div>

                    <div className="survey-item">
                      <label>Primary Transport Mode to Work</label>
                      <p>{formatLabel(surveyData.primaryTransportModeToWork || 'Not provided')}</p>
                    </div>

                    <div
                      style={{
                        padding: 'var(--space-md)',
                        backgroundColor: 'var(--color-success)',
                        color: 'white',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-lg)',
                      }}
                    >
                      <VscCheckAll />
                      <span>Thank you for completing the survey!</span>
                    </div>
                  </div>
                ) : (
                  <div className="survey-form">
                    <div className="form-group">
                      <label>Household Income</label>
                      <select
                        value={formData.householdIncome}
                        onChange={e => setFormData({
                          ...formData,
                          householdIncome: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: 'var(--space-3) var(--space-4)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)',
                          fontFamily: 'var(--font-primary)',
                          fontSize: 'var(--font-size-base)',
                        }}
                      >
                        <option value="">Select income range</option>
                        {incomeOptions.map(option => (
                          <option key={option} value={option}>
                            {formatLabel(option)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Number of Vehicles</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.vehicleCount}
                        onChange={e => setFormData({
                          ...formData,
                          vehicleCount: parseInt(e.target.value) || 0
                        })}
                        fullWidth
                      />
                    </div>

                    <div className="form-group">
                      <label>Primary Transport Mode to Work</label>
                      <select
                        value={formData.primaryTransportModeToWork}
                        onChange={e => setFormData({
                          ...formData,
                          primaryTransportModeToWork: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: 'var(--space-3) var(--space-4)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)',
                          fontFamily: 'var(--font-primary)',
                          fontSize: 'var(--font-size-base)',
                        }}
                      >
                        <option value="">Select transport mode</option>
                        {transportModes.map(mode => (
                          <option key={mode} value={mode}>
                            {formatLabel(mode)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </CardBody>

              <CardFooter>
                {surveyData && !editing ? (
                  <Button
                    variant="secondary"
                    icon={VscEdit}
                    onClick={() => setEditing(true)}
                  >
                    Edit Information
                  </Button>
                ) : (
                  <>
                    {surveyData && (
                      <Button
                        variant="ghost"
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={saveSurveyData}
                      loading={saving}
                    >
                      {surveyData ? 'Update' : 'Submit'} Survey
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Survey Info */}
          <Card padding="lg">
            <CardHeader title="Why We Ask" subtitle="About this survey" />
            <CardBody>
              <p>
                This information helps us understand travel and transportation patterns. We use this data
                to improve our recommendations and understand how different types of users plan their trips.
              </p>
              <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Your data is private and protected. It will only be used for research and improvement
                purposes in accordance with our privacy policy.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
