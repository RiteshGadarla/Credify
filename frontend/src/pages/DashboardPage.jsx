import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Shield, AlertCircle, TrendingUp, History } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex-center" style={{ height: '80vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Verifying your session...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <header className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome, {user.username}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Everything looks good today.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { icon: <Shield color="var(--success)" />, label: "Status", value: "Verified" },
          { icon: <TrendingUp color="var(--primary-dark)" />, label: "Total Claims", value: "0" },
          { icon: <AlertCircle color="var(--danger)" />, label: "Active Alerts", value: "0" },
          { icon: <History color="var(--text-muted)" />, label: "History", value: "View All" }
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card" 
            style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
          >
            <div style={{ padding: '0.75rem', background: 'var(--bg-sub)', borderRadius: '50%' }}>{stat.icon}</div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
              <h4 style={{ fontSize: '1.2rem' }}>{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <main className="grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Feed Placeholder */}
        <section className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutDashboard /> Recent Verifications
          </h3>
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column', color: 'var(--text-muted)' }}>
            <p>No claims verified yet.</p>
            <Link to="/fact-check" className="btn btn-primary" style={{ marginTop: '1rem' }}>Start New Verification</Link>
          </div>
        </section>

        {/* Sidebar Placeholder */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Profile Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.9rem' }}><strong>Email:</strong> {user.email}</p>
              <p style={{ fontSize: '0.9rem' }}><strong>Provider:</strong> {user.provider.toUpperCase()}</p>
              <p style={{ fontSize: '0.9rem' }}><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="card" style={{ background: 'var(--secondary-color)', border: 'none' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Help Center</h4>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Need assistance with your verification? Our team is here to help.</p>
            <button className="btn btn-outline" style={{ background: 'white', border: 'none', fontSize: '0.85rem' }}>View Documentation</button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
