// frontend/src/App.jsx (UPDATED)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ITServiceDesk from './pages/ITServiceDesk';
import DashboardLayout from './pages/DashboardLayout'; // or whatever your main layout is

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected routes */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <ITServiceDesk />
                            </ProtectedRoute>
                        }
                    />

                    {/* Example: Admin-only route */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireITStaff={true}>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
