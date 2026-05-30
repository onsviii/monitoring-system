import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Compass } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Default standard icon
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
  tooltipAnchor: [16, -28]
});

// Custom icon for own business
const createCompassIcon = () => {
  const svgString = renderToString(
    <div className="bg-blue-600 text-white rounded-full p-1 shadow-md flex items-center justify-center border border-white">
      <Compass className="w-4 h-4" />
    </div>
  );
  
  return L.divIcon({
    html: svgString,
    className: 'bg-transparent',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [0, -15]
  });
};

interface CompetitorMapItem {
  id: string;
  name: string;
  type: string;
  isOwn: boolean;
  latitude: number;
  longitude: number;
}

interface ReportMapProps {
  businessName: string;
  competitors: CompetitorMapItem[];
  center?: [number, number];
}

function MapUpdater({ center, competitors }: { center: [number, number]; competitors: CompetitorMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (competitors.length > 0) {
      const bounds = L.latLngBounds(competitors.map(c => [c.latitude, c.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, 13);
    }
  }, [competitors, map, center]);
  return null;
}

export default function ReportMap({ businessName, competitors, center = [49.8397, 24.0297] }: ReportMapProps) {
  const ownIcon = createCompassIcon();

  return (
    <div className="w-full h-full min-h-[240px] rounded-lg z-10 relative">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', zIndex: 10, borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {competitors.map((comp) => (
          <Marker 
            key={comp.id} 
            position={[comp.latitude, comp.longitude]}
            icon={comp.isOwn ? ownIcon : customIcon}
            zIndexOffset={comp.isOwn ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, 0]} opacity={1} permanent={comp.isOwn}>
              <span className={comp.isOwn ? "font-bold text-blue-700" : "font-medium text-gray-800"}>
                {comp.name}
              </span>
            </Tooltip>
          </Marker>
        ))}
        
        <MapUpdater center={center} competitors={competitors} />
      </MapContainer>
    </div>
  );
}
