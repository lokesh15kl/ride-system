import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Map, AlertCircle } from 'lucide-react';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    const getRoleDisplay = () => {
        if (location.pathname.startsWith('/passenger')) return 'PASSENGER';
        if (location.pathname.startsWith('/driver')) return 'DRIVER';
        if (location.pathname.startsWith('/admin')) return 'OPERATIONS CENTER';
        return '';
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-gray-100">
            {/* Navbar */}
            <header className="sticky top-0 z-50 glass-panel rounded-none border-t-0 border-x-0 !bg-surface/90 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-pulse-slow shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                        <Map size={18} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex gap-2 items-center">
                            URBAN<span className="text-primary tracking-widest font-normal">PULSE</span>
                        </h1>
                        <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">{getRoleDisplay()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        SYSTEM ONLINE
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                        <User size={20} />
                    </button>
                    <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 pb-20">
                <Outlet />
            </main>
        </div>
    );
}
