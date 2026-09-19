import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Car, ShieldAlert, Crosshair, CreditCard, LocateFixed } from 'lucide-react';
import { apiService, USE_MOCK } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
const VEHICLES = [
    { id: 'BIKE', name: 'Urban Bike', multiplier: 0.5, icon: '🚲', time: '2 min' },
    { id: 'AUTO', name: 'Grid Auto', multiplier: 0.7, icon: '🛺', time: '4 min' },
    { id: 'CAR', name: 'Comfort Sedan', multiplier: 1.0, icon: '🚗', time: '3 min' },
    { id: 'PREMIUM_CAR', name: 'Pulse Premium', multiplier: 2.0, icon: '🚙', time: '6 min' },
    { id: 'E_RIKSHAW', name: 'Eco Rikshaw', multiplier: 0.4, icon: '🔋', time: '5 min' },
];

type LocationOption = { name: string, lat: number, lon: number };

export default function PassengerDashboard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [sourceSuggestions, setSourceSuggestions] = useState<LocationOption[]>([]);
    const [destSuggestions, setDestSuggestions] = useState<LocationOption[]>([]);
    const [sourceCoords, setSourceCoords] = useState<{ lat: number, lon: number } | null>(null);
    const [destCoords, setDestCoords] = useState<{ lat: number, lon: number } | null>(null);
    const [isSourceFocused, setIsSourceFocused] = useState(false);
    const [isDestFocused, setIsDestFocused] = useState(false);
    const [vehicle, setVehicle] = useState(VEHICLES[2]);
    const [isSearching, setIsSearching] = useState(false);

    const calculateDistance = () => {
        if (!sourceCoords || !destCoords) return 0;
        const R = 6371; // km
        const dLat = (destCoords.lat - sourceCoords.lat) * Math.PI / 180;
        const dLon = (destCoords.lon - sourceCoords.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(sourceCoords.lat * Math.PI / 180) * Math.cos(destCoords.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(1, R * c);
    };

    useEffect(() => {
        if (!source || source.length < 3 || !isSourceFocused) { setSourceSuggestions([]); return; }
        const delay = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(source)}&limit=5&countrycodes=in&viewbox=80.00,17.00,81.30,16.00&bounded=1`);
                const data = await res.json();
                setSourceSuggestions(data.map((d: any) => ({ name: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })));
            } catch (e) { }
        }, 800);
        return () => clearTimeout(delay);
    }, [source, isSourceFocused]);

    useEffect(() => {
        if (!destination || destination.length < 3 || !isDestFocused) { setDestSuggestions([]); return; }
        const delay = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=5&countrycodes=in&viewbox=80.00,17.00,81.30,16.00&bounded=1`);
                const data = await res.json();
                setDestSuggestions(data.map((d: any) => ({ name: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) })));
            } catch (e) { }
        }, 800);
        return () => clearTimeout(delay);
    }, [destination, isDestFocused]);

    // Urban Pulse Mock Data (Live Simulation)
    const [activeRides, setActiveRides] = useState(142);
    const [availableDrivers, setAvailableDrivers] = useState(56);
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.CircleMarker[]>([]);
    const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);

    useEffect(() => {
        // Fetch Live Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setSourceCoords({ lat, lon });
                setSource('Current Live Location');
                if (leafletMapRef.current) {
                    leafletMapRef.current.setView([lat, lon], 14);
                    // Add current location marker
                    L.circleMarker([lat, lon], { radius: 7, color: '#00f0ff', fillColor: '#00f0ff', fillOpacity: 1, className: 'animate-ping' }).addTo(leafletMapRef.current);
                    L.circleMarker([lat, lon], { radius: 7, color: '#00f0ff', fillColor: '#00f0ff', fillOpacity: 1 }).addTo(leafletMapRef.current);
                }
            }, (err) => {
                console.log("Geolocation error", err);
            });
        }
    }, []);

    // Fetch Nearby Drivers when location or vehicle changes
    useEffect(() => {
        if (!sourceCoords) return;
        const fetchDrivers = async () => {
            try {
                const res = await apiService.getNearbyDrivers(sourceCoords.lat, sourceCoords.lon, vehicle.id);
                setNearbyDrivers(res.data || []);
                setAvailableDrivers(res.data?.length || 56);
            } catch (e) {
                console.error("Failed to fetch nearby drivers", e);
            }
        };
        fetchDrivers();
    }, [sourceCoords, vehicle.id]);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!leafletMapRef.current) {
            const map = L.map(mapRef.current, { center: [16.5062, 80.6480], zoom: 13, zoomControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', className: 'map-tiles' }).addTo(map);
            leafletMapRef.current = map;
        }

        // Clear old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add dynamically fetched drivers to the map
        nearbyDrivers.forEach(driver => {
            const marker = L.circleMarker([driver.latitude || 16.5, driver.longitude || 80.6], { radius: 5, color: '#ff003c', fillColor: '#ff003c', fillOpacity: 1 })
                .bindTooltip(`Driver: ${driver.name}`)
                .addTo(leafletMapRef.current!);
            markersRef.current.push(marker);
        });

        // Cleanup on unmount handled gracefully
    }, [nearbyDrivers]);

    useEffect(() => {
        const int = setInterval(() => {
            setActiveRides(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setAvailableDrivers(prev => prev + (Math.random() > 0.5 ? 1 : -1));
        }, 4000);
        return () => clearInterval(int);
    }, []);

    const handleRequestRide = async () => {
        setIsSearching(true);
        setStep(4);

        try {
            // Extract mock user id securely
            let uid = 'PASSENGER-1';
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.sub) uid = payload.sub;
                }
            } catch (e) { }

            const payload = {
                userId: uid,
                source,
                destination,
                sourceLatitude: sourceCoords?.lat,
                sourceLongitude: sourceCoords?.lon,
                destinationLatitude: destCoords?.lat,
                destinationLongitude: destCoords?.lon,
                vehicleType: vehicle.id
            };

            const res: any = await apiService.bookRide(payload);
            setIsSearching(false);
            setStep(5);
            setTimeout(() => {
                const acquiredRideId = res.data.ride?.rideId || res.data.rideId;
                navigate(`/passenger/ride/${acquiredRideId}`);
            }, 2000);
        } catch (e) {
            console.error("Booking Error", e);
            setIsSearching(false);
            setStep(1);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Panel - Booking Flow */}
            <div className="lg:col-span-1 glass-panel p-6 flex flex-col h-[700px] relative overflow-hidden">

                {step < 4 && (
                    <div className="space-y-6 flex-1 flex flex-col min-h-0">
                        <h2 className="text-2xl font-bold font-sans text-white border-b border-white/10 pb-4 shrink-0">Where to?</h2>

                        <div className="relative shrink-0">
                            <div className="absolute left-4 fill-none top-9 bottom-9 w-0.5 bg-gray-600"></div>

                            <div className="relative flex items-center mb-6">
                                <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center z-10 shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                    <Crosshair size={14} className="text-primary" />
                                </div>
                                <div className="w-full relative ml-4">
                                    <input type="text" className="input-field w-full" placeholder="Pickup location" value={source} onChange={(e) => setSource(e.target.value)} onFocus={() => setIsSourceFocused(true)} onBlur={() => setTimeout(() => setIsSourceFocused(false), 200)} />
                                    {sourceSuggestions.length > 0 && isSourceFocused && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                                            {sourceSuggestions.map((s, i) => (
                                                <div key={i} className="p-3 hover:bg-white/10 cursor-pointer text-sm font-sans text-gray-200 border-b border-white/5 last:border-0 truncate" onMouseDown={() => { setSource(s.name); setSourceCoords({ lat: s.lat, lon: s.lon }); setSourceSuggestions([]); setIsSourceFocused(false); }}>{s.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative flex items-center">
                                <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center z-10 shrink-0">
                                    <MapPin size={14} className="text-accent" />
                                </div>
                                <div className="w-full relative ml-4">
                                    <input type="text" className="input-field w-full" placeholder="Destination point" value={destination} onChange={(e) => setDestination(e.target.value)} onFocus={() => setIsDestFocused(true)} onBlur={() => setTimeout(() => setIsDestFocused(false), 200)} />
                                    {destSuggestions.length > 0 && isDestFocused && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                                            {destSuggestions.map((s, i) => (
                                                <div key={i} className="p-3 hover:bg-white/10 cursor-pointer text-sm font-sans text-gray-200 border-b border-white/5 last:border-0 truncate" onMouseDown={() => { setDestination(s.name); setDestCoords({ lat: s.lat, lon: s.lon }); setDestSuggestions([]); setIsDestFocused(false); }}>{s.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {(sourceCoords && destCoords) && (
                            <div className="mt-8 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                                <h3 className="text-sm font-mono text-gray-400 mb-4 tracking-wider">AVAILABLE MOBILITY NODES</h3>
                                <div className="space-y-3">
                                    {VEHICLES.map(v => (
                                        <div
                                            key={v.id}
                                            onClick={() => setVehicle(v)}
                                            className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${vehicle.id === v.id ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]' : 'border-white/5 bg-surface hover:border-gray-500'}`}
                                        >
                                            <span className="text-3xl">{v.icon}</span>
                                            <div className="flex-1">
                                                <div className="font-bold text-white flex justify-between">
                                                    <span>{v.name}</span>
                                                    <span className="text-primary">≈ ₹{Math.round((50 + calculateDistance() * 15) * v.multiplier)}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">{v.time} away • {(calculateDistance()).toFixed(1)} km route</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/10 shrink-0 mt-auto">
                            <button
                                disabled={!source || !destination}
                                onClick={handleRequestRide}
                                className="btn-primary w-full text-lg shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                                Initialize Route
                            </button>
                        </div>
                    </div>
                )}

                {isSearching && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-secondary opacity-50 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                            <Navigation size={32} className="text-primary animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Orchestrating Grid...</h2>
                            <p className="text-gray-400 text-sm">Locating nearest {vehicle.name} driver</p>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            <ShieldAlert size={40} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Node Secured</h2>
                            <p className="text-gray-400 text-sm">Transferring telemetry data...</p>
                        </div>
                    </div>
                )}

            </div>

            {/* Right Panel - Map & Urban Pulse Visualization */}
            <div className="lg:col-span-2 space-y-6">

                {/* Map Area */}
                <div className="glass-panel h-[500px] relative flex shadow-2xl overflow-hidden group border border-white/10">
                    <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0, backgroundColor: '#0c0c0c' }}></div>

                    <div className="absolute top-4 left-4 z-[400] bg-black/80 backdrop-blur border border-white/10 p-3 rounded-lg flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-gray-300">LIVE SATELLITE LINK</span>
                    </div>
                </div>

                {/* Urban Pulse Activity Tracker */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-panel p-4 flex flex-col justify-center">
                        <span className="text-xs font-mono text-gray-400 mb-1">GRID LOAD</span>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-primary">82%</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full w-[82%]"></div>
                        </div>
                    </div>
                    <div className="glass-panel p-4 flex flex-col justify-center">
                        <span className="text-xs font-mono text-gray-400 mb-1">ACTIVE ROUTES</span>
                        <div className="text-2xl font-bold">{activeRides}</div>
                    </div>
                    <div className="glass-panel p-4 flex flex-col justify-center">
                        <span className="text-xs font-mono text-gray-400 mb-1">AVAILABLE NODES</span>
                        <div className="text-2xl font-bold text-secondary text-shadow-sm">{availableDrivers}</div>
                    </div>
                    <div className="glass-panel p-4 flex flex-col justify-center">
                        <span className="text-xs font-mono text-gray-400 mb-1">AVG grid ETA</span>
                        <div className="text-2xl font-bold">2.4 min</div>
                    </div>
                </div>

            </div>

        </div>
    );
}
