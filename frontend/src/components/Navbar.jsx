import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, CheckCircle } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar glass" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '1rem 0',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '2rem'
    }}>
      <div className="container flex-center" style={{ justifyContent: 'space-between' }}>
        <Link to="/" className="flex-center" style={{ gap: '0.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          <CheckCircle size={32} />
          Credify
        </Link>
        <div className="flex-center" style={{ gap: '1.5rem' }}>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link" style={{ fontWeight: 500 }}>Dashboard</Link>
              <div className="flex-center" style={{ gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border-color)' }}>
                {user.picture ? (
                  <img src={user.picture} alt={user.username} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  <User size={20} />
                )}
                <span style={{ fontWeight: 600 }}>{user.username}</span>
                <button onClick={handleLogout} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
