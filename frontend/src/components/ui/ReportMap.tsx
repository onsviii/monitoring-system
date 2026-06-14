import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Compass } from 'lucide-react';
import { renderToString } from 'react-dom/server';

const COMPETITOR_COLORS = ['#10b981', '#f59e0b', '#d97706', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

// 1. Іконка для власного бізнесу
const createCompassIcon = () => {
  const svgString = renderToString(
      <div className="bg-blue-600 text-white rounded-full p-1.5 shadow-lg flex items-center justify-center border-2 border-white">
        <Compass className="w-4 h-4" />
      </div>
  );

  return L.divIcon({
    html: svgString,
    className: 'bg-transparent',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    tooltipAnchor: [0, -18]
  });
};

// 2. Динамічна кольорова іконка для конкурентів
const createCompetitorIcon = (colorHex: string) => {
  const svgString = renderToString(
      <div
          style={{ backgroundColor: colorHex }}
          className="text-white rounded-full w-6 h-6 shadow-md flex items-center justify-center border-2 border-white ring-1 ring-black/5"
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
  );

  return L.divIcon({
    html: svgString,
    className: 'bg-transparent',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -14]
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

  // Відфільтруємо лише конкурентів, щоб правильно призначати індекс кольору
  const onlyCompetitors = competitors.filter(c => !c.isOwn);

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

          {competitors.map((comp) => {
            // Визначаємо іконку: якщо свій - беремо компас, якщо чужий - генеруємо кольорову точку
            let iconToUse = ownIcon;

            if (!comp.isOwn) {
              const compIndex = onlyCompetitors.findIndex(c => c.id === comp.id);
              const color = COMPETITOR_COLORS[compIndex % COMPETITOR_COLORS.length];
              iconToUse = createCompetitorIcon(color);
            }

            return (
                <Marker
                    key={comp.id}
                    position={[comp.latitude, comp.longitude]}
                    icon={iconToUse}
                    zIndexOffset={comp.isOwn ? 1000 : 0}
                >
                  <Tooltip direction="top" offset={[0, 0]} opacity={1} permanent={comp.isOwn}>
                <span className={comp.isOwn ? "font-bold text-blue-700" : "font-medium text-gray-800"}>
                  {comp.name}
                </span>
                  </Tooltip>
                </Marker>
            );
          })}

          <MapUpdater center={center} competitors={competitors} />
        </MapContainer>
      </div>
  );
}