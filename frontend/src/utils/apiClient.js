// frontend/src/utils/apiClient.js
import axios from 'axios';
import { API_BASE } from '../config/api';

/**
 * Create axios instance with JWT token from localStorage
 * Automatically includes Authorization header in all requests
 */
const createApiClient = () => {
    const client = axios.create({
        baseURL: API_BASE,
        timeout: 10000
    });

    // Request interceptor - add token to headers
    client.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('authToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 (token expired)
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                // Token expired or invalid - clear auth and redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );

    return client;
};

const apiClient = createApiClient();

export default apiClient;

/**
 * Helper functions for common API calls
 */
export const ticketAPI = {
    // Get all tickets (filtered by user if not IT Staff)
    getTickets: () => apiClient.get('/tickets'),

    // Get single ticket
    getTicket: (ticketId) => apiClient.get(`/tickets/${ticketId}`),

    // Create new ticket
    createTicket: (ticketData) => apiClient.post('/tickets', ticketData),

    // Update ticket (IT Staff only)
    updateTicket: (ticketId, updateData) => apiClient.put(`/tickets/${ticketId}`, updateData),

    // Delete ticket (IT Staff only)
    deleteTicket: (ticketId) => apiClient.delete(`/tickets/${ticketId}`),

    // Get statistics
    getStats: () => apiClient.get('/tickets/stats')
};
