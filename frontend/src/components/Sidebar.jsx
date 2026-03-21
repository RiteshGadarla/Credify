import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Sparkles, ScanEye, LogOut, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    
    if (!user) return null;

    return (
        <aside className="app-sidebar">
            <div className="sidebar-brand">
                <ShieldCheck size={26} className="brand-icon" />
                <h2>Credify</h2>
            </div>
            
            <nav className="sidebar-nav">
                <span className="nav-section-label">Main</span>
                <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={19} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/fact-check" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <Search size={19} />
                    <span>Fact Check</span>
                </NavLink>

                <span className="nav-section-label">Coming Soon</span>
                <div className="nav-item" style={{opacity: 0.45, cursor: 'default'}}>
                    <Sparkles size={19} />
                    <span>AI Detection</span>
                    <span className="coming-soon-tag">Soon</span>
                </div>
                <div className="nav-item" style={{opacity: 0.45, cursor: 'default'}}>
                    <ScanEye size={19} />
                    <span>Deepfake Detection</span>
                    <span className="coming-soon-tag">Soon</span>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    {user.picture ? (
                        <img src={user.picture} alt="profile" className="avatar" />
                    ) : (
                        <div className="avatar fallback"><User size={16} /></div>
                    )}
                    <span className="username">{user.username}</span>
                </div>
                <button onClick={logout} className="logout-btn">
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
