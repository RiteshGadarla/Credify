import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Sparkles, ScanEye, LogOut, User, ShieldCheck, Type } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    
    const [isDyslexicMode, setIsDyslexicMode] = useState(() => {
        return localStorage.getItem('dyslexicMode') === 'true';
    });

    useEffect(() => {
        if (isDyslexicMode) {
            document.body.classList.add('dyslexic-mode');
            localStorage.setItem('dyslexicMode', 'true');
        } else {
            document.body.classList.remove('dyslexic-mode');
            localStorage.setItem('dyslexicMode', 'false');
        }

        // Cleanup on unmount to ensure logic doesn't leak to login/signup pages
        return () => {
            document.body.classList.remove('dyslexic-mode');
        };
    }, [isDyslexicMode]);

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

                <span className="nav-section-label">Tools</span>
                <NavLink to="/ai-detection" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <Sparkles size={19} />
                    <span>AI Detection</span>
                </NavLink>

                <span className="nav-section-label">Coming Soon</span>
                <div className="nav-item" style={{opacity: 0.45, cursor: 'default'}}>
                    <ScanEye size={19} />
                    <span>Deepfake Detection</span>
                    <span className="coming-soon-tag">Soon</span>
                </div>

                <span className="nav-section-label">Preferences</span>
                <div 
                    className={`nav-item ${isDyslexicMode ? 'active' : ''}`} 
                    onClick={() => setIsDyslexicMode(!isDyslexicMode)} 
                    style={{cursor: 'pointer'}}
                >
                    <Type size={19} />
                    <span>Dyslexia Friendly</span>
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
