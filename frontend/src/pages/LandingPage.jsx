import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Globe, Github } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <div className="landing-page" style={{ paddingBottom: '5rem' }}>
      {/* Hero Section */}
      <section className="container text-center" style={{ marginTop: '5rem', marginBottom: '8rem' }}>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: 1.1 }}
        >
          Verify the <span style={{ color: 'var(--primary-dark)' }}>Truth</span> <br /> In an Era of Misinformation
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: 700, margin: '0 auto 3rem' }}
        >
          Credify helps you verify claims and facts using state-of-the-art AI and trusted data sources. Get verified instantly.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-center" 
          style={{ gap: '1rem' }}
        >
          <Link to="/signup" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>Get Started Free</Link>
          <Link to="/login" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>View Demo</Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        {[
          { icon: <ShieldCheck size={32} />, title: "Secure & Reliable", desc: "Built with production-grade security and robust architecture." },
          { icon: <Zap size={32} />, title: "Instant Verification", desc: "Get verification results in milliseconds with our optimized engine." },
          { icon: <Globe size={32} />, title: "Global Scale", desc: "Supporting multiple languages and global data sources." }
        ].map((feature, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>{feature.icon}</div>
            <h3 style={{ marginBottom: '1rem' }}>{feature.title}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="container" style={{ marginTop: '10rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
        <p className="text-center" style={{ color: 'var(--text-muted)' }}>
          © 2026 Credify. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
