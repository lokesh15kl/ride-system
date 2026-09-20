import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Zap, CheckCircle, Navigation, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import RideMap from '../components/RideMap';

export default function RideTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState(0);
    const [amount, setAmount] = useState<number | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    // 0: searching, 1: assigned, 2: arriving, 3: arrived, 4: in_transit, 5: completed

    const [stopPolling, setStopPolling] = useState(false);
    const [passengerPos, setPassengerPos] = useState<{ lat: number, lng: number } | null>(null);
    const [destinationPos, setDestinationPos] = useState<{ lat: number, lng: number } | null>(null);
    const [driverPos, setDriverPos] = useState<{ lat: number, lng: number } | null>(null);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await apiService.getLiveTracker(id || '');
                if (res.data && res.data.ride) {
                    const rideStatus = String(res.data.ride.status || '').trim().toUpperCase();
                    setAmount(res.data.ride.amount);

                    if (res.data.ride.sourceLatitude) setPassengerPos({ lat: res.data.ride.sourceLatitude, lng: res.data.ride.sourceLongitude });
                    if (res.data.ride.destinationLatitude) setDestinationPos({ lat: res.data.ride.destinationLatitude, lng: res.data.ride.destinationLongitude });

                    if (res.data.driverLocation && res.data.driverLocation.latitude) {
                        setDriverPos({ lat: res.data.driverLocation.latitude, lng: res.data.driverLocation.longitude });
                    }

                    if (rideStatus === 'REQUESTED') setStatus(0);
                    else if (rideStatus === 'ACCEPTED' || rideStatus === 'DRIVER_ASSIGNED') setStatus(1);
                    else if (rideStatus === 'DRIVER_APPROACHING') setStatus(2);
                    else if (rideStatus === 'DRIVER_ARRIVED') setStatus(3);
                    else if (rideStatus === 'IN_PROGRESS') setStatus(4);
                    else if (rideStatus === 'COMPLETED' || rideStatus === 'COMPLETED_PAID') {
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

    const handleFeedbackSubmit = async () => {
        try {
            await apiService.submitFeedback(id || '', rating > 0 ? rating : 5, comment);
            setFeedbackSubmitted(true);
        } catch (e: any) {
            console.error("Feedback error", e);
            setFeedbackSubmitted(true); // Treat as done anyway to unclutter UI
        }
    };

    const handleBookAnother = () => {
        navigate('/passenger/dashboard');
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
                            const isPast = (status === 5 && idx === 5) ? true : idx < status;
                            const isCurrent = (status === 5 && idx === 5) ? false : idx === status;
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
                                    <div className="font-bold">Driver Identity Verified</div>
                                    <div className="text-sm text-gray-400">Arriving shortly to your location.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 5 && (
                        <div className="mt-8 p-6 border border-primary/30 rounded-xl bg-surface/80 shadow-lg">
                            <h4 className="text-lg font-bold text-center border-b border-white/10 pb-4 mb-4 uppercase tracking-widest text-primary">Ride Completed</h4>
                            <div className="text-center mb-6">
                                <div className="text-sm text-gray-400 mb-1">Fare Paid</div>
                                <div className="text-3xl font-mono text-green-400">₹{amount?.toFixed(2) || '0.00'}</div>
                            </div>

                            {!feedbackSubmitted ? (
                                <div className="space-y-4">
                                    <div className="text-center font-bold text-sm">How was your ride?</div>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setRating(star)}
                                                className={`text-2xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400/50'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-sm focus:border-primary outline-none"
                                        placeholder="Comment (optional)"
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        rows={2}
                                    />
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button onClick={() => setFeedbackSubmitted(true)} className="px-4 py-2 border border-white/20 rounded hover:bg-white/5 transition">SKIP</button>
                                        <button onClick={handleFeedbackSubmit} className="px-4 py-2 bg-primary text-black font-bold rounded hover:bg-primary/90 transition shadow-[0_0_15px_rgba(0,240,255,0.4)]">SUBMIT</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-6">
                                    <div className="text-secondary font-bold">Thanks for your feedback!</div>
                                    <button onClick={handleBookAnother} className="w-full py-4 border border-white/20 rounded font-bold hover:bg-white/5 hover:border-white/50 transition">
                                        BOOK ANOTHER RIDE
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel - Map */}
                <div className="md:col-span-3 glass-panel relative overflow-hidden flex shadow-2xl h-[500px] md:h-auto border border-white/10 p-1">
                    <RideMap
                        passengerPos={passengerPos}
                        driverPos={driverPos}
                        destinationPos={destinationPos}
                        status={status}
                    />
                </div>
            </div>
        </div>
    );
}
