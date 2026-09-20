import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Zap, CheckCircle, Navigation, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

export default function RideTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState(0);
    const [amount, setAmount] = useState<number | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    // 0: searching, 1: assigned, 2: arriving, 3: arrived, 4: in_transit, 5: completed

    const [stopPolling, setStopPolling] = useState(false);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await apiService.getLiveTracker(id || '');
                if (res.data && res.data.ride) {
                    const rideStatus = res.data.ride.status;
                    setAmount(res.data.ride.amount);
                    if (rideStatus === 'REQUESTED') setStatus(0);
                    else if (rideStatus === 'ACCEPTED' || rideStatus === 'DRIVER_ASSIGNED') setStatus(1);
                    else if (rideStatus === 'DRIVER_APPROACHING') setStatus(2);
                    else if (rideStatus === 'DRIVER_ARRIVED') setStatus(3);
                    else if (rideStatus === 'IN_PROGRESS') setStatus(4);
                    else if (rideStatus === 'COMPLETED') {
                        setStatus(5);
                        setStopPolling(true);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        if (!stopPolling) {
            fetchState();
            const timer = setInterval(fetchState, 3000);
            return () => clearInterval(timer);
        }
    }, [id, stopPolling]);

    useEffect(() => {
        if (status === 5) {
            console.log("Ride completed, stopping polling.");
        }
    }, [status]);

    const handlePayment = async () => {
        // Obsolete as payment is auto, but keeping for fallback
        setIsPaying(true);
        try {
            await apiService.payForRide(id || 'unknown');
            setIsPaying(false);
            navigate('/passenger/dashboard');
        } catch (e) {
            setIsPaying(false);
            navigate('/passenger/dashboard');
        }
    };

    const statuses = [
        { key: 'REQUESTED', label: 'Signal Broadcasted' },
        { key: 'DRIVER_ASSIGNED', label: 'Node Assigned' },
        { key: 'DRIVER_ARRIVING', label: 'Node Approaching' },
        { key: 'DRIVER_ARRIVED', label: 'Node at Location' },
        { key: 'RIDE_STARTED', label: 'In Transit' },
        { key: 'COMPLETED', label: 'Destination Reached' },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">

            {/* Top Banner */}
            <div className="glass-panel p-4 mb-4 flex justify-between items-center bg-black/60 sticky top-0 z-10 border border-white/5">
                <div>
                    <h2 className="text-xl font-bold font-sans">Route Telemetry Link</h2>
                    <div className="text-xs text-primary/80 mb-1">Near-real-time ride and location tracking using REST polling.</div>
                    <div className="text-sm font-mono text-gray-400 mt-1">ID: {id}</div>
                </div>
                {status === 5 ? (
                    <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30">
                        <CheckCircle size={18} />
                        Auto-Paid: ₹{amount?.toFixed(2) || '0.00'}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        LOCKED ON
                    </div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Left Panel - Timeline */}
                <div className="glass-panel p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold mb-8">Mission Status</h3>

                    <div className="relative border-l border-white/10 ml-4 space-y-8">
                        {statuses.map((s, idx) => {
                            const isPast = idx < status;
                            const isCurrent = idx === status;
                            const isFuture = idx > status;

                            return (
                                <div key={s.key} className="relative pl-6">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 bg-background 
                    ${isPast ? 'border-primary bg-primary' : ''} 
                    ${isCurrent ? 'border-primary shadow-[0_0_10px_#00f0ff] animate-pulse' : ''} 
                    ${isFuture ? 'border-gray-600' : ''}`}>
                                        {isPast && <CheckCircle size={12} className="text-black absolute -top-[2px] -left-[2px]" />}
                                    </div>

                                    <div className={isCurrent ? 'text-white font-bold' : isPast ? 'text-gray-300' : 'text-gray-600'}>
                                        {s.label}
                                    </div>

                                    {isCurrent && idx === 2 && (
                                        <div className="mt-2 text-primary font-mono text-sm animate-pulse">
                                            ETA: {6 - status} MIN
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {(status >= 1 && status < 5) && (
                        <div className="mt-12 p-4 border border-white/10 rounded-xl bg-surface/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                                    <ShieldCheck className="text-secondary" />
                                </div>
                                <div>
                                    <div className="font-bold">Driver ID: N-741</div>
                                    <div className="text-sm text-gray-400">Rating: 4.9 • Comfort Sedan</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Map */}
                <div className="md:col-span-3 glass-panel relative overflow-hidden flex shadow-2xl">
                    <div className="absolute inset-0 bg-[#070707]" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>

                        {/* Dynamic Path mapping simulation based on status */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                            {status >= 1 && status < 4 && (
                                <path d="M 20% 80% Q 50% 50%, 50% 50%" fill="none" stroke="#ff003c" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_5s_linear_infinite]" />
                            )}
                            {status >= 4 && (
                                <path d="M 50% 50% Q 70% 30%, 80% 20%" fill="none" stroke="#00f0ff" strokeWidth="3" className="shadow-[0_0_10px_#00f0ff]" />
                            )}
                        </svg>

                        {/* Driver Marker */}
                        {status >= 1 && status < 5 && (
                            <div className="absolute w-6 h-6 bg-accent rounded-full shadow-[0_0_20px_#ff003c] transition-all duration-[4000ms] z-10 flex items-center justify-center"
                                style={{
                                    left: status === 1 ? '20%' : status === 2 ? '35%' : '50%',
                                    top: status === 1 ? '80%' : status === 2 ? '65%' : '50%',
                                }}>
                                <Navigation size={12} className="text-white fill-current" />
                            </div>
                        )}

                        {/* Pickup Marker */}
                        <div className="absolute top-[50%] left-[50%] w-4 h-4 rounded-full border-2 border-primary -translate-x-1/2 -translate-y-1/2 bg-black z-0"></div>

                        {/* Destination Marker */}
                        <div className="absolute top-[20%] left-[80%] w-4 h-4 rounded-sm bg-white -translate-x-1/2 -translate-y-1/2 z-0"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
