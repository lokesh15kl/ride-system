import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Reusable Map Component for Rides
interface Coordinate {
    lat: number;
    lng: number;
}

interface RideMapProps {
    passengerPos?: Coordinate | null;
    driverPos?: Coordinate | null;
    destinationPos?: Coordinate | null;
    status: number;
}

// Custom Icons
const createIcon = (color: string, label: string) => L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; box-shadow: 0 0 10px ${color};">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const passengerIcon = createIcon('#00f0ff', 'P'); // Cyan
const driverIcon = createIcon('#ff003c', 'D'); // Neon Red
const destIcon = createIcon('#22c55e', 'X'); // Green

const AutoFitBounds: React.FC<{
    positions: (Coordinate | null | undefined)[]
}> = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        const validPositions = positions.filter((p): p is Coordinate => p !== null && p !== undefined);
        if (validPositions.length > 0) {
            const bounds = L.latLngBounds(validPositions.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [positions, map]);
    return null;
};

const RideMap: React.FC<RideMapProps> = ({ passengerPos, driverPos, destinationPos, status }) => {
    // If we have nothing to show yet
    if (!passengerPos && !driverPos && !destinationPos) {
        return (
            <div className="w-full h-full bg-[#0c0c0c] flex items-center justify-center text-gray-500 font-mono">
                WAITING FOR LOCATION DATA...
            </div>
        );
    }

    const defaultCenter = passengerPos || driverPos || destinationPos || { lat: 16.5, lng: 80.6 };

    return (
        <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
            />
            {passengerPos && <Marker position={[passengerPos.lat, passengerPos.lng]} icon={passengerIcon} />}
            {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />}
            {destinationPos && <Marker position={[destinationPos.lat, destinationPos.lng]} icon={destIcon} />}

            {/* Polyline from Passenger to Destination */}
            {passengerPos && destinationPos && (
                <Polyline positions={[[passengerPos.lat, passengerPos.lng], [destinationPos.lat, destinationPos.lng]]} color="#00f0ff" dashArray="5, 10" />
            )}

            {/* Polyline from Driver to Passenger */}
            {driverPos && passengerPos && status < 4 && (
                <Polyline positions={[[driverPos.lat, driverPos.lng], [passengerPos.lat, passengerPos.lng]]} color="#ff003c" />
            )}

            {/* Polyline from Driver to Destination (In Transit) */}
            {driverPos && destinationPos && status >= 4 && (
                <Polyline positions={[[driverPos.lat, driverPos.lng], [destinationPos.lat, destinationPos.lng]]} color="#ff003c" />
            )}

            <AutoFitBounds positions={[passengerPos, driverPos, destinationPos]} />
        </MapContainer>
    );
};

export default RideMap;
