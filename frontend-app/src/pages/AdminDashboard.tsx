import React, { useState, useEffect } from 'react';
import { Users, Truck, Activity, DollarSign, RefreshCw, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService, USE_MOCK } from '../services/api';

const chartData = [
    { name: '08:00', revenue: 4000 },
    { name: '10:00', revenue: 3000 },
    { name: '12:00', revenue: 6000 },
    { name: '14:00', revenue: 8000 },
    { name: '16:00', revenue: 5000 },
    { name: '18:00', revenue: 9000 },
];

export default function AdminDashboard() {
    const [realUsers, setRealUsers] = useState<any[]>([]);
    const [realDrivers, setRealDrivers] = useState<any[]>([]);
    const [realRides, setRealRides] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [segmentFilter, setSegmentFilter] = useState('ALL');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (!USE_MOCK) {
                const [usersRes, drvRes, ridesRes] = await Promise.all([
                    apiService.getAllUsers(),
                    apiService.getAllDrivers(),
                    apiService.getAllRides()
                ]);
                setRealUsers(usersRes.data || []);
                setRealDrivers(drvRes.data || []);
                const rides = ridesRes.data || [];
                setRealRides(rides);
                const revenue = rides.filter((r: any) => r.status === 'COMPLETED_PAID').reduce((sum: number, r: any) => sum + r.amount, 0);
                setTotalRevenue(revenue);
            } else {
                // Mock payload for design demonstration if gateway is not connected
                setRealUsers([{ username: 'mock_rider', role: 'RIDER', id: 1 }]);
                setRealDrivers([{ driverId: 'DRV-1', name: 'Mock Driver', vehicleType: 'BIKE', status: 'AVAILABLE' }]);
            }
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Live poll
        return () => clearInterval(interval);
    }, []);

    // Filter drivers
    const filteredDrivers = segmentFilter === 'ALL'
        ? realDrivers
        : realDrivers.filter(d => d.vehicleType === segmentFilter);

    // Create dynamic event feed from real users
    const liveEvents = [
        ...realRides.map(r => ({ time: new Date().toLocaleTimeString().substring(0, 5), event: `Ride ${r.status}`, id: r.rideId, color: r.status === 'COMPLETED_PAID' ? 'text-green-500' : 'text-accent' })),
        ...realUsers.map(u => ({ time: new Date().toLocaleTimeString().substring(0, 5), event: `Node Registered`, id: u.username, color: u.role === 'DRIVER' ? 'text-secondary' : 'text-primary' })),
        ...realDrivers.map(d => ({ time: new Date().toLocaleTimeString().substring(0, 5), event: `Driver Deploy [${d.vehicleType}]`, id: d.driverId, color: 'text-green-400' }))
    ].slice(0, 15); // Show latest

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold font-sans">Operations Center</h2>
                    <p className="text-gray-400">Live Grid Overview</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Sync Telemetry
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'ACTIVE NODES (Drivers)', value: realDrivers.length.toString(), icon: Truck, color: 'text-primary' },
                    { label: 'REGISTERED USERS', value: realUsers.length.toString(), icon: Users, color: 'text-secondary' },
                    { label: 'RIDES ISSUED', value: realRides.length.toString(), icon: Activity, color: 'text-accent' },
                    { label: 'TOTAL YIELD', value: `₹${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
                ].map(kpi => (
                    <div key={kpi.label} className="glass-panel p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-mono text-gray-400">{kpi.label}</span>
                            <kpi.icon size={20} className={kpi.color} />
                        </div>
                        <div className="text-3xl font-bold">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                {/* Segment Details Directory (New Feature) */}
                <div className="lg:col-span-2 glass-panel p-6 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider">Node Segment Directory</h3>

                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-md p-1">
                            <Filter size={14} className="text-gray-500 ml-2" />
                            <select
                                className="bg-transparent border-none text-xs text-white uppercase focus:ring-0 cursor-pointer outline-none pl-1"
                                value={segmentFilter}
                                onChange={(e) => setSegmentFilter(e.target.value)}
                            >
                                <option value="ALL">ALL SEGMENTS</option>
                                <option value="BIKE">Urban Bike (BIKE)</option>
                                <option value="AUTO">Grid Auto (AUTO)</option>
                                <option value="SEDAN">Comfort Sedan (SEDAN)</option>
                                <option value="PREMIUM">Pulse Premium</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-gray-500 font-mono text-xs uppercase sticky top-0 bg-surface z-10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                <tr>
                                    <th className="pb-3 border-b border-white/10 font-normal">Grid ID</th>
                                    <th className="pb-3 border-b border-white/10 font-normal">Operator</th>
                                    <th className="pb-3 border-b border-white/10 font-normal">Segment</th>
                                    <th className="pb-3 border-b border-white/10 font-normal">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredDrivers.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 text-center text-gray-600">No nodes found in this segment.</td></tr>
                                ) : (
                                    filteredDrivers.map(d => (
                                        <tr key={d.driverId} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 font-mono text-gray-300">{d.driverId}</td>
                                            <td className="py-4 text-white font-medium">{d.name}</td>
                                            <td className="py-4"><span className="px-2 py-1 bg-white/5 rounded-md text-xs text-primary">{d.vehicleType}</span></td>
                                            <td className="py-4 text-xs font-mono text-green-400">
                                                {d.verificationStatus === 'PENDING' ? (
                                                    <button onClick={async () => { await apiService.approveDriver(d.driverId); fetchData(); }} className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/40 hover:bg-yellow-500/30 transition">Approve KYC</button>
                                                ) : d.status}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Live Event Feed (Dynamically connected) */}
                <div className="glass-panel p-6 flex flex-col h-[400px]">
                    <h3 className="text-sm font-mono text-gray-400 mb-6 uppercase tracking-wider">Live Registrations</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {liveEvents.length === 0 && <div className="text-center text-sm text-gray-600 pt-10">No live data available.</div>}
                        {liveEvents.map((ev, i) => (
                            <div key={i} className="flex gap-4 p-3 rounded-lg bg-black/40 border border-white/5">
                                <div className="text-xs font-mono text-gray-500 whitespace-nowrap">{ev.time}</div>
                                <div>
                                    <div className={`text-sm font-bold ${ev.color}`}>{ev.event}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-1 w-full truncate max-w-[120px]">{ev.id}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}
