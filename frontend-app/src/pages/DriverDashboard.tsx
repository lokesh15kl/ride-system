import React, { useState } from 'react';
import { Activity, MapPin, Power, CheckCircle2, ChevronRight, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    const [request, setRequest] = useState<any>(null);

    // Simulate an incoming request after going online
    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isOnline) {
            timer = setTimeout(() => {
                setRequest({
                    id: 'REQ-8874',
                    distance: '2.4 km',
                    eta: '6 min',
                    fare: '₹180',
                    pickup: 'Central Metro Station',
                    dropoff: 'Tech Park Phase 2'
                });
            }, 3000);
        } else {
            setRequest(null);
        }
        return () => clearTimeout(timer);
    }, [isOnline]);

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
                        <div className="text-4xl font-bold text-white mb-6">₹1,420</div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Routes Completed</span>
                                <span className="font-bold">6</span>
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

                    {/* Incoming Request Overlay */}
                    {request && (
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
                                <button onClick={() => setRequest(null)} className="flex-1 py-3 rounded-lg bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-white transition-all">ACCEPT</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Demand Heatmap (Recharts) */}
                    <div className="glass-panel p-6 h-[300px] flex flex-col">
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm flex items-center gap-2">
                            <MapPin size={16} className="text-accent" /> Grid Demand Forecast
                        </h3>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff003c" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ff003c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#444" tick={{ fill: '#888' }} />
                                    <YAxis stroke="#444" tick={{ fill: '#888' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333' }} />
                                    <Area type="monotone" dataKey="load" stroke="#ff003c" fillOpacity={1} fill="url(#colorLoad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Hot Zones */}
                    <div className="glass-panel p-6">
                        <h3 className="font-bold mb-4 font-mono uppercase tracking-wider text-sm">Current Hot Zones</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { name: 'Financial District', multiplier: '2.1x', demand: 'CRITICAL', color: 'text-accent border-accent' },
                                { name: 'Central Terminal', multiplier: '1.8x', demand: 'HIGH', color: 'text-orange-500 border-orange-500' },
                                { name: 'University Campus', multiplier: '1.2x', demand: 'ELEVATED', color: 'text-yellow-500 border-yellow-500' },
                                { name: 'Sector 4 Residential', multiplier: '1.0x', demand: 'NORMAL', color: 'text-primary border-primary' },
                            ].map(zone => (
                                <div key={zone.name} className={`border-l-4 p-4 bg-surface/50 rounded-r-xl ${zone.color}`}>
                                    <div className="text-white font-bold">{zone.name}</div>
                                    <div className="flex justify-between mt-2 font-mono text-xs">
                                        <span>{zone.demand}</span>
                                        <span className="font-bold">{zone.multiplier} YIELD</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
