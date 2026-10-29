import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  VscCompass,
  VscCalendar,
  VscLocation,
  VscOrganization,
  VscSettingsGear,
} from 'react-icons/vsc';
import { GiTakeMyMoney } from 'react-icons/gi';
import { FaTrainSubway } from 'react-icons/fa6';
import './TripSubNav.css';

export default function TripSubNav({ activeTab }) {
  const { id, tripId } = useParams();
  const effectiveId = id || tripId;

  const links = [
    { to: `/trip/${effectiveId}`, label: 'Overview', icon: VscCompass, end: true },
    { to: `/trip/${effectiveId}/itinerary`, label: 'Itinerary', icon: VscCalendar },
    { to: `/trip/${effectiveId}/transit`, label: 'Smart Transit', icon: FaTrainSubway },
    { to: `/trip/${effectiveId}/places`, label: 'Curated Places', icon: VscLocation },
    { to: `/trip/${effectiveId}/expenses`, label: 'Expense Ledger', icon: GiTakeMyMoney },
    { to: `/trip/${effectiveId}/members`, label: 'Squad & Roles', icon: VscOrganization },
    { to: `/trip/${effectiveId}/settings`, label: 'Settings', icon: VscSettingsGear },
  ];

  return (
    <nav className="trip-subnav-bar" aria-label="Trip expedition sub-navigation">
      <div className="trip-subnav-shell">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `trip-subnav-link ${isActive ? 'is-active' : ''}`
              }
            >
              <Icon className="trip-subnav-icon" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
