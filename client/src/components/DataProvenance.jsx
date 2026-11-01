import React from 'react';
import {
  VscDatabase,
  VscInfo,
  VscLayers,
  VscPulse,
  VscSparkle,
  VscWarning,
} from 'react-icons/vsc';
import './DataProvenance.css';

/**
 * DataProvenanceBadge
 * Visual indicator identifying whether a metric or record is live from the DB,
 * a hardcoded benchmark, an AI curated model, or a predictive simulation.
 */
export function DataProvenanceBadge({
  type = 'live',
  label,
  size = 'sm',
  className = '',
  title,
}) {
  const getBadgeConfig = () => {
    switch (type) {
      case 'hardcoded':
        return {
          icon: <VscLayers className="data-badge-icon" aria-hidden="true" />,
          defaultLabel: 'Hardcoded Benchmark',
          defaultTitle: 'Static benchmark model data pre-configured in code.',
        };
      case 'demo':
        return {
          icon: <VscInfo className="data-badge-icon" aria-hidden="true" />,
          defaultLabel: 'Curated Demo Data',
          defaultTitle: 'Showcase demonstration dataset for presentation.',
        };
      case 'curated':
        return {
          icon: <VscSparkle className="data-badge-icon" aria-hidden="true" />,
          defaultLabel: 'AI Curated (In DB)',
          defaultTitle: 'Generated via AI Intelligence and saved to MongoDB.',
        };
      case 'simulated':
        return {
          icon: <VscPulse className="data-badge-icon" aria-hidden="true" />,
          defaultLabel: 'Transit Simulation',
          defaultTitle: 'Predictive multi-modal transit algorithm output.',
        };
      case 'live':
      default:
        return {
          icon: <span className="data-badge-pulse-dot" aria-hidden="true" />,
          defaultLabel: 'Live DB Sync',
          defaultTitle: 'Live record retrieved in real time from MongoDB.',
        };
    }
  };

  const config = getBadgeConfig();
  const text = label || config.defaultLabel;
  const tooltip = title || config.defaultTitle;

  return (
    <span
      className={`data-provenance-badge variant-${type} badge-${size} ${className}`}
      title={tooltip}
      aria-label={`${text}: ${tooltip}`}
    >
      {config.icon}
      <span>{text}</span>
    </span>
  );
}

/**
 * DataDisclaimerBanner
 * Informative callout distinguishing hardcoded or simulated values from real-time database queries.
 */
export function DataDisclaimerBanner({
  type = 'hardcoded',
  title,
  description,
  subnote,
  badgeLabel,
  className = '',
}) {
  const getBannerIcon = () => {
    switch (type) {
      case 'hardcoded':
        return <VscLayers aria-hidden="true" />;
      case 'demo':
        return <VscInfo aria-hidden="true" />;
      case 'simulated':
        return <VscPulse aria-hidden="true" />;
      case 'curated':
        return <VscSparkle aria-hidden="true" />;
      case 'live':
      default:
        return <VscDatabase aria-hidden="true" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'hardcoded':
        return 'Data Provenance Disclaimer: Hardcoded Benchmark Dataset';
      case 'demo':
        return 'Data Disclaimer: Curated Demonstration Showcase';
      case 'simulated':
        return 'Data Disclaimer: Multi-Modal Transit Simulation';
      case 'curated':
        return 'Data Attribution: AI Curated & Database Persisted';
      case 'live':
      default:
        return 'Real-Time Database Synchronized';
    }
  };

  const bannerTitle = title || getDefaultTitle();

  return (
    <div
      className={`data-disclaimer-banner variant-${type} ${className}`}
      role="note"
      aria-label={bannerTitle}
    >
      <div className="data-disclaimer-icon-wrap">{getBannerIcon()}</div>
      <div className="data-disclaimer-body">
        <div className="data-disclaimer-header-row">
          <h4 className="data-disclaimer-title">{bannerTitle}</h4>
          <DataProvenanceBadge type={type} label={badgeLabel} size="sm" />
        </div>
        {description && <p className="data-disclaimer-desc">{description}</p>}
        {subnote && <small className="data-disclaimer-subnote">{subnote}</small>}
      </div>
    </div>
  );
}

/**
 * DataProvenanceLegend
 * Subtle legend bar for dashboards & analytics pages explaining the live vs hardcoded convention.
 */
export function DataProvenanceLegend({ className = '' }) {
  return (
    <div className={`data-provenance-legend ${className}`} role="status">
      <div className="legend-item">
        <DataProvenanceBadge type="live" label="Live DB Sync" size="sm" />
        <span className="legend-desc">Real-time collections from MongoDB (trips, roster, chats, surveys)</span>
      </div>
      <div className="legend-divider" aria-hidden="true" />
      <div className="legend-item">
        <DataProvenanceBadge type="hardcoded" label="Hardcoded Benchmark" size="sm" />
        <span className="legend-desc">Pre-configured simulation models, quick presets & demo metrics</span>
      </div>
    </div>
  );
}

export default DataProvenanceBadge;
