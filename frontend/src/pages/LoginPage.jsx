import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem', background: 'var(--bg-main)', position: 'relative' }}>
      <Link 
        to="/" 
        className="flex-center hover-scale"
        style={{ 
          position: 'absolute', 
          top: '1.5rem', 
          left: '1.5rem', 
          gap: '0.5rem',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
          padding: '0.5rem 0.85rem',
          borderRadius: 'var(--radius)',
          transition: 'all 0.2s ease',
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          zIndex: 10
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--primary-light)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card" 
        style={{ maxWidth: 420, width: '100%', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Brand */}
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div className="flex-center" style={{ gap: '0.4rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={24} style={{ color: 'var(--primary-dark)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Credify</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', fontWeight: 700 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem', margin: 0 }}>Sign in to access your verification dashboard</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex-center"
            style={{
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              fontWeight: 500,
              fontSize: '0.85rem',
              border: '1px solid rgba(239, 83, 80, 0.2)'
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label"><Mail size={13} /> Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="login-email"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label"><Lock size={13} /> Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              id="login-password"
            />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--primary-dark)', fontWeight: 600 }}>Forgot password?</Link>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
            disabled={loading}
            id="login-submit"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        <div className="flex-center" style={{ margin: '1.5rem 0', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.78rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        <div className="flex-center" style={{ width: '100%' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            useOneTap
            width="100%"
            theme="outline"
            shape="pill"
          />
        </div>

        <div className="text-center" style={{ marginTop: '2rem', color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Sign up</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
