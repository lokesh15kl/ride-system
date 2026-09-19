import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DashboardLayout from './layouts/DashboardLayout';
import RideTracking from './pages/RideTracking';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                {/* Protected Routes (using simple layout integration for now) */}
                <Route element={<DashboardLayout />}>
                    <Route path="/passenger/dashboard" element={<PassengerDashboard />} />
                    <Route path="/passenger/ride/:id" element={<RideTracking />} />

                    <Route path="/driver/dashboard" element={<DriverDashboard />} />

                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
