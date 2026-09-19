import axios from 'axios';

// Replace with API Gateway URL from .env in production
const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'; // Disabled by default

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor for JWT auth
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ----------- MOCK SERVICES -----------

export const mockRideService = {
    bookRide: async (payload: any) => {
        return new Promise((resolve) => setTimeout(() => resolve({
            data: {
                rideId: "UP-RIDE-" + Math.floor(Math.random() * 10000),
                status: "REQUESTED",
                amount: Math.floor(Math.random() * 150) + 50,
                ...payload
            }
        }), 1200));
    },
    getNearbyDrivers: async (lat: number, lng: number, type: string) => {
        return new Promise((resolve) => setTimeout(() => resolve({
            data: [
                { driverId: 'DRV-001', name: 'Alex M.', latitude: lat + 0.01, longitude: lng + 0.01, vehicleType: type, rating: 4.8 },
                { driverId: 'DRV-003', name: 'Sarah K.', latitude: lat - 0.01, longitude: lng - 0.005, vehicleType: type, rating: 4.9 }
            ]
        }), 800));
    },
    processPayment: async (rideId: string) => {
        return new Promise((resolve) => setTimeout(() => resolve({
            data: { status: "COMPLETED", message: "Mock Payment Successful for " + rideId }
        }), 1500));
    }
};

export const apiService = {
    login: (data: any) => apiClient.post('/auth/login', null, { params: data }),
    register: (data: any) => apiClient.post('/auth/register', null, { params: data }),
    bookRide: (data: any) => USE_MOCK ? mockRideService.bookRide(data) : apiClient.post('/rides/book', null, { params: data }),
    getNearbyDrivers: (lat: number, lng: number, type: string) => USE_MOCK ? mockRideService.getNearbyDrivers(lat, lng, type) : apiClient.get('/rides/nearby-drivers', { params: { latitude: lat, longitude: lng, vehicleType: type } }),
    payForRide: (rideId: string) => USE_MOCK ? mockRideService.processPayment(rideId) : apiClient.post('/rides/pay', null, { params: { rideId: rideId } }),
    getLiveTracker: (rideId: string) => apiClient.get(`/rides/track/${rideId}`), // Public endpoint (Ola/Rapido style)
    getAllRides: () => apiClient.get('/rides/all'),

    // Auth & Users
    getAllUsers: () => apiClient.get('/auth/users'),

    // Drivers
    registerDriver: (driverId: string, name: string, vehicleType: string) => apiClient.post('/drivers/register', null, { params: { driverId, name, vehicleType } }),
    getAllDrivers: () => apiClient.get('/drivers/all')
};

export default apiClient;
