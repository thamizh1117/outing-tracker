import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapContext = createContext(null);

export function Map({ children, className }) {
  const mapContainer = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log("Map component mounted");
    
    if (!mapContainer.current) return;

    // Use a reliable open style
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [77.5946, 12.9716], // [longitude, latitude]
      zoom: 12,
    });

    console.log("MapLibre initialized");

    map.on('load', () => {
      console.log("Map loaded");
      setIsLoaded(true);
      map.resize();
    });

    setMapInstance(map);

    return () => {
      map.remove();
      setMapInstance(null);
      setIsLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (mapInstance && isLoaded) {
      // Small timeout to handle potential container reflows
      const timer = setTimeout(() => {
        mapInstance.resize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mapInstance, isLoaded]);

  return (
    <div ref={mapContainer} className={className} style={{ width: '100%', height: '400px', position: 'relative' }}>
      {isLoaded && mapInstance && (
        <MapContext.Provider value={mapInstance}>
          {children}
        </MapContext.Provider>
      )}
    </div>
  );
}

export function MapMarker({ latitude, longitude, color, popupContent }) {
  const map = useContext(MapContext);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    console.log("Adding marker at", longitude, latitude);
    
    // maplibre expects [lng, lat]
    const marker = new maplibregl.Marker({ color: color || '#FF0000' })
      .setLngLat([longitude, latitude]);

    if (popupContent) {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);
    }

    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map]); // intentionally only mount/unmount logic

  // Handle position updates
  useEffect(() => {
    if (markerRef.current && longitude !== undefined && latitude !== undefined) {
      console.log("Updating marker to", longitude, latitude);
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [longitude, latitude]);

  return null;
}
