import React, { useState, useEffect } from 'react';
import { Activity, MapPin, Power, CheckCircle2, ChevronRight, DollarSign, LocateFixed, Navigation } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import RideMap from '../components/RideMap';

const data = [
    { time: '08:00', load: 20 },
    { time: '10:00', load: 50 },
    { time: '12:00', load: 90 },
    { time: '14:00', load: 60 },
    { time: '16:00', load: 75 },
    { time: '18:00', load: 100 },
];

export default function DriverDashboard() {
    const [isOnline, setIsOnline] = useState(false);
    const [driverPos, setDriverPos] = useState<{ lat: number, lng: number } | null>(null);
    const [request, setRequest] = useState<any>(null);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [lastCompletedRide, setLastCompletedRide] = useState<any>(null);
    const [completingRide, setCompletingRide] = useState(false);
    const [driverStats, setDriverStats] = useState({ yield: 0, completed: 0 });

    // Secure extraction of driverId from token
    const getDriverId = () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.sub || 'DRV-1';
            }
        } catch (e) { }
        return 'DRV-1';
    };

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (isOnline) {
            // Geolocation tracking
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    setDriverPos({ lat, lng: lon });
                    const driverId = getDriverId();
                    apiService.updateDriverLocation(driverId, lat, lon).catch(console.error);
                },
                (err) => console.error("Geolocation error", err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );

            const pollDriverState = async () => {
                try {
                    const driverId = getDriverId();
                    // 1. Check if we ALREADY have an active ride on the backend
                    const activeRes = await apiService.getDriverRides(driverId);
                    const allRides = activeRes.data || [];

                    const completedRides = allRides.filter((r: any) => r.status === 'COMPLETED');
                    const yieldValue = completedRides.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
                    setDriverStats({ yield: yieldValue, completed: completedRides.length });

                    const myActiveRide = allRides.find((r: any) =>
                        ['ACCEPTED', 'DRIVER_APPROACHING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(r.status)
                    );

                    if (myActiveRide) {
                        setActiveRide({
                            rideId: myActiveRide.rideId,
                            status: myActiveRide.status,
                            distance: 'Tracking...',
                            eta: 'Live',
                            fare: `₹${myActiveRide.amount?.toFixed(2)}`,
                            pickup: myActiveRide.source || 'Unknown Location',
                            dropoff: myActiveRide.destination || 'Unknown Dropoff',
                            passengerPos: myActiveRide.sourceLatitude ? { lat: myActiveRide.sourceLatitude, lng: myActiveRide.sourceLongitude } : null,
                            destinationPos: myActiveRide.destinationLatitude ? { lat: myActiveRide.destinationLatitude, lng: myActiveRide.destinationLongitude } : null
                        });
                        setRequest(null);
                        return; // Skip requested rides if we are busy
                    } else if (activeRide) {
                        setActiveRide(null); // Backend says we are free
                    }

                    // 2. Clear Active, check requested
                    if (!myActiveRide) {
                        const res = await apiService.getRequestedRides();
                        const reqs = res.data || [];
                        if (reqs.length > 0) {
                            // Filter for rides that truly need dispatch (could add vehicleType checks if it was stored locally, but we rely on backend for now)
                            const r = reqs[reqs.length - 1]; // pick the most recent one for the broadcast!

                            // Simple Haversine logic or fallback
                            let distDisplay = 'Calculating...';
                            if (r.sourceLatitude && r.sourceLongitude && r.destinationLatitude && r.destinationLongitude) {
                                const dLat = (r.destinationLatitude - r.sourceLatitude) * (Math.PI / 180);
                                const dLon = (r.destinationLongitude - r.sourceLongitude) * (Math.PI / 180);
                                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(r.sourceLatitude * (Math.PI / 180)) * Math.cos(r.destinationLatitude * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                const d = 6371 * c;
                                distDisplay = d > 0.1 ? (d.toFixed(1) + ' km') : 'Nearby';
                            }

                            setRequest({
                                rideId: r.rideId,
                                distance: distDisplay,
                                eta: 'N/A', // Dynamic tracking typically uses external APIs
                                fare: `₹${r.amount?.toFixed(2)}`,
                                pickup: r.source || 'Unknown Location',
                                dropoff: r.destination || 'Unknown Dropoff',
                                passengerPos: r.sourceLatitude ? { lat: r.sourceLatitude, lng: r.sourceLongitude } : null,
                                destinationPos: r.destinationLatitude ? { lat: r.destinationLatitude, lng: r.destinationLongitude } : null
                            });
                        } else {
                            setRequest(null);
                        }
                    }
                } catch (e) {
                    console.error("Poller issue", e);
                }
            };

            pollDriverState();
            timer = setInterval(pollDriverState, 3000);
            return () => {
                if (timer) clearInterval(timer);
                if (watchId) navigator.geolocation.clearWatch(watchId);
            };
        } else {
            if (timer) clearInterval(timer);
            setRequest(null);
            // We consciously intentionally do not clear activeRide here, the user might just toggle offline
        }
    }, [isOnline]); // removed activeRide dependency to keep poll running

    const handleAcceptRide = async () => {
        if (!request) return;
        try {
            await apiService.acceptRide(request.rideId, getDriverId());
            setActiveRide({ ...request, status: 'ACCEPTED' });
            setRequest(null);
        } catch (e: any) {
            console.error("Failed to accept ride", e);
            if (e.response?.status === 403) {
                alert("Driver is not authorized to accept this ride.");
            } else if (e.response?.status === 409) {
                alert("Ride has already been accepted by another driver.");
            } else if (e.response?.status === 404) {
                alert("Ride no longer exists.");
            } else if (e.response?.status === 401) {
                alert("Please log in again.");
            } else {
                alert("Ride acceptance failed due to a server error.");
            }
            // Specifically DO NOT clear the request here, let the automated poll figure out if it's still alive or taken by another driver.
        }
    };

    const handleApproach = async () => {
        if (!activeRide) return;
        try {
            await apiService.approachRide(activeRide.rideId);
            setActiveRide({ ...activeRide, status: 'DRIVER_APPROACHING' });
        } catch (e) { console.error(e); }
    };

    const handleArrive = async () => {
        if (!activeRide) return;
        try {
            await apiService.arriveRide(activeRide.rideId);
            setActiveRide({ ...activeRide, status: 'DRIVER_ARRIVED' });
        } catch (e) { console.error(e); }
    };

    const handleStart = async () => {
        if (!activeRide) return;
        try {
            await apiService.startRide(activeRide.rideId);
            setActiveRide({ ...activeRide, status: 'IN_PROGRESS' });
        } catch (e) { console.error(e); }
    };

    const handleCompleteRide = async () => {
        if (!activeRide || completingRide) return;
        setCompletingRide(true);
        try {
            await apiService.completeRide(activeRide.rideId, getDriverId());
            setLastCompletedRide({
                rideId: activeRide.rideId,
                fare: activeRide.fare,
                earnings: activeRide.fare // Assuming 100% earnings for now
            });
            setActiveRide(null);
        } catch (e: any) {
            console.error("Failed to complete ride", e);
            alert("Completion Failed: " + (e.response?.data?.error || e.message));
        } finally {
            setCompletingRide(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Header & Status Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-6 rounded-2xl border border-white/5">
                <div>
                    <h2 className="text-2xl font-bold font-sans">Telemetry Uplink</h2>
                    <p className="text-gray-400 mt-1">Status: {isOnline ? <span className="text-green-400 font-bold">ONLINE</span> : <span className="text-red-400 font-bold">OFFLINE</span>}</p>
                </div>

                <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-8 py-4 rounded-xl flex items-center gap-3 font-bold text-lg transition-all shadow-xl ${isOnline ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-primary text-black shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-white'}`}>
                    <Power size={24} />
                    {isOnline ? 'DISCONNECT GRID' : 'CONNECT TO GRID'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* Earnings Card */}
                    <div className="glass-panel p-6">
                        <div className="text-gray-400 font-mono text-sm mb-2 uppercase">Today's Yield</div>
                        <div className="text-4xl font-bold text-white mb-6">₹{driverStats.yield.toFixed(2)}</div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Routes Completed</span>
                                <span className="font-bold">{driverStats.completed}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Active Node Time</span>
                                <span className="font-bold">4.2 hrs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Yield / Hour</span>
                                <span className="font-bold text-primary">₹338</span>
                            </div>
                        </div>
                    </div>

                    {/* Last Completed Ride Overlay */}
                    {lastCompletedRide && (
                        <div className="glass-panel p-6 border-2 border-green-500 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-in slide-in-from-top-4 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 text-green-400 font-bold">
                                    <CheckCircle2 /> RIDE COMPLETED
                                </div>
                                <button onClick={() => setLastCompletedRide(null)} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/40">DISMISS</button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Payment Status</span>
                                    <span className="font-bold text-green-400 flex items-center gap-1"><CheckCircle2 size={14} /> PAID</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ride Fare</span>
                                    <span className="font-bold">{lastCompletedRide.fare}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Driver Earnings</span>
                                    <span className="font-bold text-primary">{lastCompletedRide.earnings}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Incoming Request Overlay */}
                    {request ? (
                        <div className="glass-panel p-6 border-2 border-primary bg-primary/10 shadow-[0_0_30px_rgba(0,240,255,0.2)] animate-in slide-in-from-bottom-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Activity className="animate-pulse" /> INCOMING REQUEST
                                </div>
                                <div className="font-mono text-sm text-gray-400">{request.eta}</div>
                            </div>

                            <div className="space-y-4 mb-6 relative">
                                <div className="absolute left-[9px] top-4 bottom-4 w-[2px] bg-white/10"></div>
                                <div className="flex gap-4 relative">
                                    <div className="w-5 h-5 rounded-full bg-surface border border-white z-10 flex shrink-0"></div>
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase font-mono">Pickup</div>
                                        <div className="font-bold">{request.pickup}</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 relative">
                                    <div className="w-5 h-5 rounded-sm bg-primary z-10 flex shrink-0 shadow-[0_0_10px_#00f0ff]"></div>
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase font-mono">Dropoff</div>
                                        <div className="font-bold">{request.dropoff}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl mb-6">
                                <div>
                                    <div className="text-xs text-gray-400">Est. Distance</div>
                                    <div className="font-bold text-lg">{request.distance}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400">Est. Yield</div>
                                    <div className="font-bold text-lg text-green-400">{request.fare}</div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setRequest(null)} className="flex-1 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-all">DECLINE</button>
                                <button onClick={handleAcceptRide} className="flex-1 py-3 rounded-lg bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-white transition-all">ACCEPT</button>
                            </div>
                        </div>
                    ) : (
                        !activeRide && (
                            <div className="glass-panel p-10 flex flex-col items-center justify-center text-center opacity-70 animate-in fade-in zoom-in duration-500 min-h-[300px]">
                                <LocateFixed size={48} className="text-gray-500 mb-4 animate-pulse duration-1000" />
                                <div className="text-xl font-bold text-gray-400 uppercase tracking-widest">NO INCOMING REQUESTS</div>
                                <div className="text-sm mt-3 text-gray-500 font-mono flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                    SCANNING SECTOR
                                </div>
                            </div>
                        )
                    )}

                    {/* Active Ride Overlay */}
                    {activeRide && (
                        <div className="glass-panel p-6 border-2 border-green-500 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-in slide-in-from-bottom-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2 text-green-400 font-bold">
                                    <Navigation className="animate-bounce" /> ACTIVE ROUTE
                                </div>
                                <div className="font-mono text-sm text-gray-400">{activeRide.rideId}</div>
                            </div>

                            <div className="space-y-4 mb-6 relative">
                                <div className="absolute left-[9px] top-4 bottom-4 w-[2px] bg-white/10"></div>
                                <div className="flex gap-4 relative">
                                    <div className="w-5 h-5 rounded-full bg-surface border border-white z-10 flex shrink-0"></div>
                                    <div>
                                        <div className="text-xs text-green-400 uppercase font-mono">Passenger Location</div>
                                        <div className="font-bold">{activeRide.pickup}</div>
                                    </div>
                                </div>
                                <div className="flex gap-4 relative">
                                    <div className="w-5 h-5 rounded-sm bg-green-500 z-10 flex shrink-0 shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                                    <div>
                                        <div className="text-xs text-green-400 uppercase font-mono">Target Destination</div>
                                        <div className="font-bold">{activeRide.dropoff}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl mb-6">
                                <div className="text-right w-full">
                                    <div className="text-xs text-gray-400">Yield Collection</div>
                                    <div className="font-bold text-2xl text-green-400">{activeRide.fare}</div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {activeRide.status === 'ACCEPTED' && (
                                    <button onClick={handleApproach} className="flex-1 py-4 rounded-lg bg-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:bg-yellow-400 transition-all text-lg">APPROACH ROUTE</button>
                                )}
                                {activeRide.status === 'DRIVER_APPROACHING' && (
                                    <button onClick={handleArrive} className="flex-1 py-4 rounded-lg bg-orange-500 text-black font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:bg-orange-400 transition-all text-lg">MARK ARRIVED</button>
                                )}
                                {activeRide.status === 'DRIVER_ARRIVED' && (
                                    <button onClick={handleStart} className="flex-1 py-4 rounded-lg bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-primary/80 transition-all text-lg">START RIDE</button>
                                )}
                                {activeRide.status === 'IN_PROGRESS' && (
                                    <button onClick={handleCompleteRide} disabled={completingRide} className="flex-1 py-4 rounded-lg bg-green-500 text-black font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-400 disabled:bg-green-800 disabled:opacity-50 transition-all text-lg">
                                        {completingRide ? 'COMPLETING...' : 'MARK COMPLETION'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">

                    {/* Live Ride Map */}
                    <div className="glass-panel p-1 border border-white/10 h-[500px]">
                        <RideMap
                            driverPos={driverPos}
                            passengerPos={activeRide?.passengerPos || request?.passengerPos}
                            destinationPos={activeRide?.destinationPos || request?.destinationPos}
                            status={activeRide ? (activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ASSIGNED' ? 1 : activeRide.status === 'DRIVER_APPROACHING' ? 2 : activeRide.status === 'DRIVER_ARRIVED' ? 3 : activeRide.status === 'IN_PROGRESS' ? 4 : 5) : 0}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
