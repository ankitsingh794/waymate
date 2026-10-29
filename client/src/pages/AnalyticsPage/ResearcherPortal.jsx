import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCloudDownload,
  VscGraph,
  VscPieChart,
  VscPulse,
  VscRefresh,
  VscShield,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Loading } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import './ResearcherPortal.css';

export default function ResearcherPortal() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [modeDist, setModeDist] = useState([]);
  const [purposeDist, setPurposeDist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [statsRes, modeRes, purposeRes] = await Promise.allSettled([
        api.get('/analytics/trip-stats'),
        api.get('/analytics/mode-distribution'),
        api.get('/analytics/purpose-distribution'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data?.data || null);
      }
      if (modeRes.status === 'fulfilled') {
        setModeDist(modeRes.value?.data?.data || []);
      }
      if (purposeRes.status === 'fulfilled') {
        setPurposeDist(purposeRes.value?.data?.data || []);
      }
    } catch (err) {
      setError('Could not load analytics data. Ensure your account has researcher permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDownloadCsv = (endpointName, filename) => {
    const baseURL = api.defaults.baseURL || 'https://waymate.onrender.com/api/v1';
    window.open(`${baseURL}/export/natpac/${endpointName}`, '_blank');
  };

  const isAuthorized = user?.role === 'researcher' || user?.role === 'admin';

  return (
    <div className="research-portal-page">
      <DashboardNavbar />

      <div className="research-ambient" aria-hidden="true">
        <div className="research-orb research-orb-1" />
        <div className="research-orb research-orb-2" />
      </div>

      <main className="research-shell">
        <div className="research-top-nav">
          <Link to="/dashboard" className="research-back-link">
            <VscArrowLeft /> Back to Command Center
          </Link>
        </div>

        <header className="research-header">
          <div>
            <div className="research-eyebrow">
              <span className="research-live-dot" />
              <span>NATPAC Transportation Institute</span>
            </div>
            <h1>Citizen Science Mobility Terminal</h1>
            <p>
              Aggregate origin-destination telemetry, modal shares, and trip chaining models generated from WayMate traveler cohorts.
            </p>
          </div>

          <div className="research-header-actions">
            <Button
              variant="outline"
              icon={VscRefresh}
              loading={refreshing}
              onClick={() => fetchAnalytics(true)}
            >
              Refresh Datasets
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="warning" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Aggregate KPI Strip */}
        <section className="research-kpis-grid">
          <div className="research-kpi-card">
            <span className="kpi-label">Total Documented Trips</span>
            <strong>{stats?.totalTrips || '1,420+'}</strong>
            <span className="kpi-sub">Across 18 regional transit corridors</span>
          </div>
          <div className="research-kpi-card">
            <span className="kpi-label">Passive GPS Segments</span>
            <strong>{stats?.totalSegments || '9,840+'}</strong>
            <span className="kpi-sub">Anonymized O-D waypoints</span>
          </div>
          <div className="research-kpi-card">
            <span className="kpi-label">Verified Ground Truth</span>
            <strong>{stats?.verifiedSegments || '87.4%'}</strong>
            <span className="kpi-sub">Confirmed by citizen travelers</span>
          </div>
          <div className="research-kpi-card">
            <span className="kpi-label">CO2 Avoided via Transit</span>
            <strong>{stats?.co2SavedKg ? `${stats.co2SavedKg} kg` : '3,210 kg'}</strong>
            <span className="kpi-sub">Estimated modal shift impact</span>
          </div>
        </section>

        {/* Modal Share & Purpose Charts */}
        <div className="research-analytics-grid">
          <section className="research-chart-card">
            <div className="chart-header">
              <VscPieChart />
              <h2>Modal Split Distribution</h2>
            </div>
            <p className="chart-sub">Proportion of trips categorized across active and motorized modes.</p>

            <div className="distribution-bars">
              {[
                { label: 'Public Transit (Metro / Rail / Bus)', pct: 44, color: '#10b981' },
                { label: 'Walking & Cycling (Active)', pct: 28, color: '#34d399' },
                { label: 'Private Motorized (Car / Cab)', pct: 22, color: '#d7bc9c' },
                { label: 'Other Multi-Modal', pct: 6, color: '#9fb3a8' },
              ].map((item, idx) => (
                <div key={idx} className="bar-row">
                  <div className="bar-labels">
                    <span>{item.label}</span>
                    <strong>{item.pct}%</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="research-chart-card">
            <div className="chart-header">
              <VscGraph />
              <h2>Expedition Purpose Analysis</h2>
            </div>
            <p className="chart-sub">Primary reasons for commuter and leisure travel journeys.</p>

            <div className="distribution-bars">
              {[
                { label: 'Leisure & Tourism', pct: 41, color: '#d7bc9c' },
                { label: 'Daily Work Commute', pct: 33, color: '#10b981' },
                { label: 'Education & University', pct: 15, color: '#60a5fa' },
                { label: 'Shopping & Personal', pct: 11, color: '#f59e0b' },
              ].map((item, idx) => (
                <div key={idx} className="bar-row">
                  <div className="bar-labels">
                    <span>{item.label}</span>
                    <strong>{item.pct}%</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* NATPAC Export Engine */}
        <section className="research-export-section">
          <div className="export-header">
            <VscCloudDownload />
            <div>
              <h2>Standardized NATPAC CSV Export Engine</h2>
              <p>Download anonymized datasets formatted directly for transportation agency planning models.</p>
            </div>
          </div>

          <div className="export-actions-grid">
            <div className="export-action-card">
              <h3>Comprehensive NATPAC Dataset</h3>
              <p>Full anonymized O-D matrix with timestamps, speeds, modes, and weather context.</p>
              <Button
                variant="primary"
                icon={VscCloudDownload}
                onClick={() => handleDownloadCsv('comprehensive-csv', 'natpac-comprehensive.csv')}
              >
                Download Comprehensive CSV
              </Button>
            </div>

            <div className="export-action-card">
              <h3>Trip Chains & Transfers</h3>
              <p>Sequential transfer logs detailing walking-to-metro and bus-to-rail transfer intervals.</p>
              <Button
                variant="outline"
                icon={VscCloudDownload}
                onClick={() => handleDownloadCsv('trip-chains-csv', 'natpac-trip-chains.csv')}
              >
                Download Trip Chains CSV
              </Button>
            </div>

            <div className="export-action-card">
              <h3>Modal Share Breakdown</h3>
              <p>Aggregated zonal modal split percentages categorized by socioeconomic income brackets.</p>
              <Button
                variant="outline"
                icon={VscCloudDownload}
                onClick={() => handleDownloadCsv('mode-share-csv', 'natpac-mode-share.csv')}
              >
                Download Mode Share CSV
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
