import React, { useEffect, useRef } from 'react';
import Map, { useControl } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';


import 'mapbox-gl/dist/mapbox-gl.css';


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

class GlobeSpinnerControl {
  constructor() {
    this._map = null;
    this._container = document.createElement('div'); 
    this.userInteracting = false;
    this.spinEnabled = true;
    this.animationFrameId = null;
  }

  onAdd = (map) => {
    this._map = map;

    const onInteraction = () => { this.userInteracting = true; };
    const onInteractionEnd = () => {
      this.userInteracting = false;
      setTimeout(() => { if (this.spinEnabled) { this.userInteracting = false; } }, 5000);
    };

    this._map.on('mousedown', onInteraction);
    this._map.on('touchstart', onInteraction);
    this._map.on('mouseup', onInteractionEnd);
    this._map.on('touchend', onInteractionEnd);

    this.spinGlobe();
    return this._container;
  }

  onRemove = () => {
    if (this._map) {
        this._map.off('mousedown', this.onInteraction);
        this._map.off('touchstart', this.onInteraction);
        this._map.off('mouseup', this.onInteractionEnd);
        this._map.off('touchend', this.onInteractionEnd);
    }
    this.spinEnabled = false;
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
    }
    this._container.remove();
    this._map = null;
  }

  spinGlobe = () => {
    if (this.spinEnabled && !this.userInteracting && this._map) {
      const center = this._map.getCenter();
      center.lng -= 0.01; 
      this._map.easeTo({ center, duration: 1, easing: (n) => n });
    }
    this.animationFrameId = requestAnimationFrame(this.spinGlobe);
  }
}

function GlobeSpinner() {
  useControl(() => new GlobeSpinnerControl());
  return null; 
}


export default function Globe() {
  if (!MAPBOX_TOKEN) {
    return (
        <div className="globe-container" style={{ display: 'grid', placeItems: 'center', backgroundColor: '#4a5759' }}>
            <p style={{ color: 'white', fontFamily: 'sans-serif', maxWidth: '300px', textAlign: 'center' }}>
                Please add your VITE_MAPBOX_TOKEN to a .env file in your project root.
            </p>
        </div>
    );
  }

  return (
    <div className="globe-container">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -90,
          latitude: 40,
          zoom: 1.5
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12" 
        projection={{name: 'globe'}}
      >
        <GlobeSpinner />
      </Map>
    </div>
  );
}
