import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// @ts-ignore
import iconUrl from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationMapProps {
  location: Location | null;
  onChange: (coords: Location) => void;
  radiusKm?: number;
}

function LocationMarker({ location, onChange }: { location: Location | null, onChange: (coords: Location) => void }) {
  useMapEvents({
    click(e) {
      onChange({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });

  return location === null ? null : (
    <Marker position={[location.latitude, location.longitude]} icon={customIcon} />
  );
}

function MapUpdater({ location }: { location: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude]);
    }
  }, [location, map]);
  return null;
}

export default function LocationMap({ location, onChange, radiusKm }: LocationMapProps) {
  const defaultCenter: [number, number] = [49.8397, 24.0297]; // Lviv

  return (
    <div className="w-full h-[300px] border border-gray-200 rounded-xl overflow-hidden shadow-3xs z-10 relative">
      <MapContainer 
        center={location ? [location.latitude, location.longitude] : defaultCenter}
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} onChange={onChange} />
        {location && radiusKm && radiusKm > 0 && (
          <Circle
            center={[location.latitude, location.longitude]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
          />
        )}
        <MapUpdater location={location} />
      </MapContainer>
    </div>
  );
}
