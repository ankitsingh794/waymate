import React from 'react';
import './Globe.css';

export default function Globe() {
    return (
        <div className="globe-container">
            <div className="globe-content">
                <div className="globe-text">
                    <h2>Explore the World with WayMate</h2>
                    <p>Discover destinations across 150+ countries and plan your next adventure</p>
                </div>
                <div className="globe-visual">
                    <div className="globe-sphere">
                        <div className="globe-ring"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
