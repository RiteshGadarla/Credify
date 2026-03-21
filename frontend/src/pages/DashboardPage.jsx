import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Shield, AlertCircle, TrendingUp, History, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../api/factCheck';

const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex-center" style={{ height: '80vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Verifying your session...</p>
    </div>
  );

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistory
  });

  if (!user) return <Navigate to="/login" />;

  const m = historyData?.metrics || { total: 0, correct: 0, wrong: 0, partial: 0, accuracy: 0 };
  const historyList = historyData?.history || [];

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <header className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome, {user.username}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Here are your Fact-Check engine analytics.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { icon: <TrendingUp color="var(--primary-dark)" />, label: "Total Claims Verified", value: isLoading ? "..." : m.total },
          { icon: <Shield color="var(--success)" />, label: "Correct Predictions", value: isLoading ? "..." : m.correct },
          { icon: <AlertCircle color="var(--danger)" />, label: "Wrong Predictions", value: isLoading ? "..." : m.wrong },
          { icon: <CheckCircle color="var(--text-muted)" />, label: "Average Accuracy", value: isLoading ? "..." : `${m.accuracy}%` }
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
        {/* Main Feed */}
        <section className="card" style={{ minHeight: '400px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History /> Recent Verifications
          </h3>
          {isLoading ? (
            <div className="flex-center" style={{ height: '300px', color: 'var(--text-muted)' }}>Loading history...</div>
          ) : historyList.length === 0 ? (
            <div className="flex-center" style={{ height: '300px', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <p>No claims verified yet.</p>
              <Link to="/fact-check" className="btn btn-primary" style={{ marginTop: '1rem' }}>Start New Verification</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {historyList.slice(0, 10).map((item) => (
                <div key={item._id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h5 style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '1rem' }}>{item.claim}</h5>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: item.verdict === 'TRUE' ? 'var(--success-light)' : item.verdict === 'FALSE' ? 'var(--danger-light)' : 'var(--warning-light)',
                      color: item.verdict === 'TRUE' ? 'var(--success)' : item.verdict === 'FALSE' ? 'var(--danger)' : 'var(--warning)'
                    }}>
                      {item.verdict}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {item.summary ? item.summary.substring(0, 120) + '...' : 'No summary available.'}
                  </p>
                  <small style={{ color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
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
