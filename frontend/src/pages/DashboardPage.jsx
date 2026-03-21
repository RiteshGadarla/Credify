import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { TrendingUp, Shield, AlertTriangle, Target, History, ArrowRight, Search, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../api/factCheck';
import './DashboardPage.css';

const StatCard = ({ icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    className="stat-card"
  >
    <div className="stat-icon-wrap" style={{ background: `${color}12`, color: color }}>
      {icon}
    </div>
    <div className="stat-info">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  </motion.div>
);

const SkeletonCard = () => (
  <div className="stat-card">
    <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }}></div>
    <div className="stat-info" style={{ flex: 1 }}>
      <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
      <div className="skeleton skeleton-text lg" style={{ width: '40%' }}></div>
    </div>
  </div>
);

const HistorySkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="history-item-skeleton">
        <div className="skeleton skeleton-text" style={{ width: '70%', height: 16 }}></div>
        <div className="skeleton skeleton-text" style={{ width: '90%', height: 12 }}></div>
        <div className="skeleton skeleton-text" style={{ width: '30%', height: 12 }}></div>
      </div>
    ))}
  </div>
);

const AccuracyRing = ({ value }) => {
  const radius = 50;
  const stroke = 7;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? 'var(--success)' : value >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="accuracy-ring-container">
      <svg height={radius * 2} width={radius * 2} className="accuracy-ring-svg">
        <circle
          stroke="var(--bg-sub)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="accuracy-ring-value">
        <span className="accuracy-number" style={{ color }}>{value}%</span>
        <span className="accuracy-label">Accuracy</span>
      </div>
    </div>
  );
};

const getVerdictStyle = (verdict) => {
  if (verdict === 'TRUE') return { bg: 'var(--success-light)', color: 'var(--success)', label: 'True' };
  if (verdict === 'FALSE') return { bg: 'var(--danger-light)', color: 'var(--danger)', label: 'False' };
  return { bg: 'var(--warning-light)', color: 'var(--warning)', label: verdict || 'Pending' };
};

const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex-center" style={{ height: '80vh' }}>
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Verifying your session...</p>
      </div>
    </div>
  );

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistory
  });

  if (!user) return <Navigate to="/login" />;

  const m = historyData?.metrics || { total: 0, correct: 0, wrong: 0, partial: 0, accuracy: 0 };
  const historyList = historyData?.history || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dashboard-page">
      {/* Header */}
      <motion.header
        className="dashboard-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="header-text">
          <h1>{greeting}, {user.username?.split(' ')[0]}!</h1>
          <p>Here's your verification activity at a glance.</p>
        </div>
        <Link to="/fact-check" className="btn btn-primary btn-lg header-cta">
          <Search size={18} />
          New Verification
        </Link>
      </motion.header>

      {/* Stats Grid */}
      <section className="stats-grid">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard icon={<TrendingUp size={22} />} label="Total Verified" value={m.total} color="#03A9F4" delay={0.05} />
            <StatCard icon={<Shield size={22} />} label="Correct" value={m.correct} color="#66BB6A" delay={0.1} />
            <StatCard icon={<AlertTriangle size={22} />} label="Incorrect" value={m.wrong} color="#EF5350" delay={0.15} />
            <StatCard icon={<Target size={22} />} label="Accuracy" value={`${m.accuracy}%`} color="#FFA726" delay={0.2} />
          </>
        )}
      </section>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Recent Verifications */}
        <motion.section
          className="card recent-verifications"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <div className="section-header">
            <div className="section-header-left">
              <History size={18} />
              <h3>Recent Verifications</h3>
            </div>
            {historyList.length > 0 && (
              <span className="badge badge-neutral">{historyList.length} total</span>
            )}
          </div>

          {isLoading ? (
            <HistorySkeleton />
          ) : historyList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} />
              </div>
              <h4>No verifications yet</h4>
              <p>Start analyzing claims to build your verification history.</p>
              <Link to="/fact-check" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                <Search size={16} />
                Start First Verification
              </Link>
            </div>
          ) : (
            <div className="history-list">
              {historyList.slice(0, 8).map((item, idx) => {
                const vs = getVerdictStyle(item.verdict);
                return (
                  <motion.div
                    key={item._id}
                    className="history-item"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.04 }}
                  >
                    <div className="history-item-top">
                      <h5 className="history-claim">{item.claim}</h5>
                      <span className="badge" style={{ background: vs.bg, color: vs.color }}>
                        {vs.label}
                      </span>
                    </div>
                    <p className="history-summary">
                      {item.summary ? item.summary.substring(0, 120) + '...' : 'No summary available.'}
                    </p>
                    <div className="history-meta">
                      <Clock size={12} />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Right Panel */}
        <div className="dashboard-right-panel">
          {/* Accuracy Donut */}
          <motion.div
            className="card accuracy-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h4 className="section-title-sm">Overall Accuracy</h4>
            {isLoading ? (
              <div className="flex-center" style={{ height: 120 }}>
                <div className="skeleton skeleton-circle" style={{ width: 100, height: 100 }}></div>
              </div>
            ) : (
              <AccuracyRing value={m.accuracy || 0} />
            )}
            <div className="accuracy-breakdown">
              <div className="breakdown-row">
                <span className="breakdown-dot" style={{ background: 'var(--success)' }}></span>
                <span>Correct</span>
                <span className="breakdown-value">{m.correct}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-dot" style={{ background: 'var(--danger)' }}></span>
                <span>Incorrect</span>
                <span className="breakdown-value">{m.wrong}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-dot" style={{ background: 'var(--warning)' }}></span>
                <span>Partial</span>
                <span className="breakdown-value">{m.partial}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="card quick-actions-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <h4 className="section-title-sm">Quick Actions</h4>
            <Link to="/fact-check" className="quick-action-item">
              <div className="qa-icon-wrap">
                <Search size={16} />
              </div>
              <div className="qa-text">
                <span className="qa-title">Verify a Claim</span>
                <span className="qa-desc">Analyze text for factual accuracy</span>
              </div>
              <ChevronRight size={16} className="qa-chevron" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
