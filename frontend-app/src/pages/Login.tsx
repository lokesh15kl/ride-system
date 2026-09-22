import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Car, User, ShieldAlert } from 'lucide-react';
import { apiService, USE_MOCK } from '../services/api';

export default function Login() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState(params.get('role') || 'passenger');

    // Form fields
    const [email, setEmail] = useState(''); // Serves as Username/ID
    const [password, setPassword] = useState('');
    const [vehicleType, setVehicleType] = useState('BIKE'); // Driver segment

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            if (isLogin) {
                // Real Authentication Flow
                const res = await apiService.login({ username: email, password: password });
                if (res.data.token) {
                    const actualRole = res.data.role ? res.data.role.toLowerCase() : role;

                    // Validate role mapping
                    const mappedRole = actualRole === 'rider' ? 'passenger' : actualRole;

                    if (mappedRole !== role) {
                        setError(`Account is registered as ${mappedRole.toUpperCase()}, not ${role.toUpperCase()}.`);
                        setIsLoading(false);
                        return;
                    }

                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('role', mappedRole);

                    if (mappedRole === 'driver') {
                        try {
                            const dStatus = await apiService.getDriverStatus(email);
                            if (dStatus.data.verificationStatus === 'PENDING') {
                                localStorage.removeItem('token');
                                localStorage.removeItem('role');
                                setError('Your driver account is awaiting Admin approval.');
                                setIsLoading(false);
                                return;
                            } else if (dStatus.data.verificationStatus === 'REJECTED') {
                                localStorage.removeItem('token');
                                localStorage.removeItem('role');
                                setError('Your KYC was rejected. Please contact support.');
                                setIsLoading(false);
                                return;
                            }
                            navigate('/driver/dashboard');
                        } catch (e: any) {
                            if (e.response?.status === 404) {
                                setError('Driver profile not found.');
                            } else {
                                setError('Unable to connect to the server. Please try again.');
                            }
                            setIsLoading(false);
                            return;
                        }
                    } else if (mappedRole === 'passenger') {
                        navigate('/passenger/dashboard');
                    } else if (mappedRole === 'admin') {
                        navigate('/admin/dashboard');
                    }
                }
            } else {
                // Real Registration Flow
                let roleParam = 'RIDER';
                if (role === 'admin') roleParam = 'ADMIN';
                if (role === 'driver') roleParam = 'DRIVER';

                await apiService.register({ username: email, password, role: roleParam });

                // If Driver, register them in Driver Microservice
                if (role === 'driver') {
                    await apiService.registerDriver(email, email.split('@')[0], vehicleType);
                }

                setMessage('Registration successful! Please login.');
                setIsLogin(true);
            }
        } catch (err: any) {
            console.error(err);
            if (USE_MOCK) {
                // Fallback to mock login if they don't have gateway running properly
                setTimeout(() => {
                    localStorage.setItem('token', 'mock_token_urbanpulse');
                    localStorage.setItem('role', role);
                    if (role === 'passenger') navigate('/passenger/dashboard');
                    else if (role === 'driver') navigate('/driver/dashboard');
                    else if (role === 'admin') navigate('/admin/dashboard');
                    setIsLoading(false);
                }, 1000);
            } else {
                const status = err.response?.status;
                const errorData = err.response?.data;
                const backendMsg = errorData?.message || errorData?.error;

                if (backendMsg && backendMsg !== "Unauthorized") {
                    setError(backendMsg);
                } else if (status === 401) {
                    setError("Authentication required.");
                } else if (status === 403) {
                    setError("You are not authorized to perform this action.");
                } else if (status === 400) {
                    setError("Invalid registration details.");
                } else if (status === 409) {
                    setError("Username already exists.");
                } else {
                    setError("Unable to connect to the server. Please try again.");
                }
            }
        } finally {
            if (!USE_MOCK) setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="w-full max-w-md glass-panel p-8 z-10">
                <div className="flex flex-col items-center mb-8">
                    <Activity size={40} className="text-primary mb-4 shadow-[0_0_15px_rgba(0,240,255,0.5)] rounded-full bg-primary/10 p-2" />
                    <h2 className="text-3xl font-bold font-sans text-white">System Access</h2>
                    <p className="text-gray-400 mt-2 text-sm">{isLogin ? 'Identify your node type' : 'Register new grid node'}</p>
                </div>

                <div className="flex gap-2 p-1 bg-black/50 rounded-lg mb-8 border border-white/5">
                    <button type="button" onClick={() => setRole('passenger')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'passenger' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}>
                        <User size={16} className="inline mr-2" />Passenger
                    </button>
                    <button type="button" onClick={() => setRole('driver')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'driver' ? 'bg-secondary text-white' : 'text-gray-400 hover:text-white'}`}>
                        <Car size={16} className="inline mr-2" />Driver
                    </button>
                    <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'admin' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}>
                        <ShieldAlert size={16} className="inline mr-2" />Admin
                    </button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded-lg">{error}</div>}
                {message && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 text-sm rounded-lg">{message}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Node ID (Username)</label>
                        <input type="text" className="input-field" placeholder="identifier@grid.net" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Access Code (Password)</label>
                        <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>

                    {!isLogin && role === 'driver' && (
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Vehicle Segment</label>
                            <select className="input-field cursor-pointer" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                                <option value="BIKE">Urban Bike (BIKE)</option>
                                <option value="AUTO">Grid Auto (AUTO)</option>
                                <option value="SEDAN">Comfort Sedan (SEDAN)</option>
                                <option value="PREMIUM">Pulse Premium (PREMIUM)</option>
                            </select>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="btn-primary mt-4 w-full flex justify-center items-center">
                        {isLoading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : (isLogin ? "Authenticate" : "Deploy Node")}
                    </button>

                    <div className="text-center mt-2">
                        <span className="text-xs text-gray-400 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? "Initialize new node (Register)" : "Access existing node (Login)"}
                        </span>
                    </div>

                    <p className="text-center text-xs text-primary mt-4 opacity-70">
                        {USE_MOCK ? "System running in MOCK mode. Backend API calls are completely simulated." : "System routing active through API Gateway."}
                    </p>
                </form>
            </div>
        </div>
    );
}
