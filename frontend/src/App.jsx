import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import FactCheckDashboard from './pages/FactCheckDashboard';
import AiDetectionPage from './pages/AiDetectionPage';
import DeepfakeDetectionPage from './pages/DeepfakeDetectionPage';
import './styles/index.css';

const LoadingScreen = () => (
  <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-main)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--primary-dark)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}></div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Loading...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--bg-main)' }}>
      {user && <Sidebar />}
      <main style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
        <Routes>
          {/* Unauthenticated Routes */}
          {!user ? (
            <>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/fact-check" element={<FactCheckDashboard />} />
              <Route path="/ai-detection" element={<AiDetectionPage />} />
              <Route path="/deepfake-detection" element={<DeepfakeDetectionPage />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <Router>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </GoogleOAuthProvider>
    </Router>
  );
};

export default App;
