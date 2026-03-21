import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Search, Globe, ArrowRight, CheckCircle2, BarChart3, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div
    className="card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{ textAlign: 'left', padding: '1.75rem' }}
  >
    <div style={{
      width: 44,
      height: 44,
      borderRadius: 'var(--radius)',
      background: 'var(--primary-ghost)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary-dark)',
      marginBottom: '1rem'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0 }}>{description}</p>
  </motion.div>
);

const LandingPage = () => {
  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 2.5rem',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={24} style={{ color: 'var(--primary-dark)' }} />
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Credify</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/signup" className="btn btn-primary">Get Started</Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '6rem 2rem 4rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="badge badge-primary" style={{ marginBottom: '1.25rem', display: 'inline-flex', padding: '0.3rem 0.9rem', fontSize: '0.78rem' }}>
            <Zap size={12} />
            AI-Powered Fact Verification
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '1.25rem',
            lineHeight: 1.15,
            letterSpacing: '-0.03em'
          }}
        >
          Verify the <span style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Truth</span>
          <br />
          In an Era of Misinformation
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            maxWidth: 600,
            margin: '0 auto 2.5rem',
            lineHeight: 1.7,
          }}
        >
          Credify uses multi-agent AI to analyze claims against trusted data sources. Get instant, evidence-backed verdicts with full transparency.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
        >
          <Link to="/signup" className="btn btn-primary btn-lg" style={{ gap: '0.5rem' }}>
            Get Started Free
            <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn btn-outline btn-lg">
            View Demo
          </Link>
        </motion.div>
      </section>

      {/* How It Works */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem 5rem' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', marginBottom: '2.5rem' }}
        >
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>How It Works</h2>
          <p style={{ color: 'var(--text-tertiary)', maxWidth: 500, margin: '0 auto', fontSize: '0.95rem' }}>
            Our multi-agent system ensures every claim is rigorously analyzed from multiple angles.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <FeatureCard
            icon={<Search size={22} />}
            title="Claim Extraction"
            description="Our AI identifies verifiable claims from any text — articles, social media posts, or statements."
            delay={0.45}
          />
          <FeatureCard
            icon={<Brain size={22} />}
            title="Multi-Agent Debate"
            description="Proponent and Opponent agents argue for and against each claim using real evidence from trusted sources."
            delay={0.55}
          />
          <FeatureCard
            icon={<BarChart3 size={22} />}
            title="Verdict & Scoring"
            description="A Judge agent synthesizes the debate into a clear verdict with a confidence score and full reasoning."
            delay={0.65}
          />
        </div>
      </section>

      {/* Trust Strip */}
      <section style={{ 
        borderTop: '1px solid var(--border-subtle)', 
        borderBottom: '1px solid var(--border-subtle)', 
        padding: '2.5rem 2rem',
        background: 'var(--bg-sub)',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {[
            { icon: <CheckCircle2 size={18} />, text: 'Evidence-backed verdicts' },
            { icon: <Globe size={18} />, text: 'Real-time source verification' },
            { icon: <ShieldCheck size={18} />, text: 'Transparent reasoning' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}
            >
              <span style={{ color: 'var(--primary-dark)' }}>{item.icon}</span>
              {item.text}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
            <span>© 2026 Credify. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/login" style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontWeight: 500 }}>Login</Link>
            <Link to="/signup" style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontWeight: 500 }}>Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
