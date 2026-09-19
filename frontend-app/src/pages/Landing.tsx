import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
            {/* Background Visuals */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface via-background to-background pointer-events-none"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>

            {/* City Grid CSS Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <nav className="relative z-10 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center animate-pulse-slow shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                        <Activity size={24} className="text-black" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        URBAN<span className="text-primary tracking-widest font-normal">PULSE</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white font-medium transition-colors">
                    Sign In
                </button>
            </nav>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto mt-[-5vh]">
                <h2 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 mb-6 leading-tight">
                    Your city. <br />
                    Your route. <br />
                    <span className="text-primary drop-shadow-[0_0_25px_rgba(0,240,255,0.5)]">Your pulse.</span>
                </h2>

                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
                    Intelligent real-time ride orchestration connecting passengers and drivers across the urban grid.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md justify-center">
                    <button onClick={() => navigate('/login?role=passenger')} className="btn-primary flex items-center justify-center gap-2 group">
                        Book a Ride
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => navigate('/login?role=driver')} className="btn-secondary">
                        Become a Driver
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left border-t border-white/5 pt-16 w-full">
                    <div className="glass-panel p-6 border-l-4 border-l-primary">
                        <Zap className="text-primary mb-4" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Real-time Orchestration</h3>
                        <p className="text-gray-400 text-sm">Advanced spatial algorithms match you with the closest vehicles inside the urban grid instantly.</p>
                    </div>
                    <div className="glass-panel p-6 border-l-4 border-l-secondary">
                        <ShieldCheck className="text-secondary mb-4" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Absolute Security</h3>
                        <p className="text-gray-400 text-sm">Every trip is monitored in real-time by the operations center with end-to-end telemetry mapping.</p>
                    </div>
                    <div className="glass-panel p-6 border-l-4 border-l-accent">
                        <Map className="text-accent mb-4" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Dynamic Heatmaps</h3>
                        <p className="text-gray-400 text-sm">Drivers receive live intelligent demand routing to optimize earnings and availability.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
