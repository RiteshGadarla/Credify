import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Sparkles, ScanEye, LogOut, User, ShieldCheck, Type, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const UserAvatar = ({ user }) => {
    const [imgError, setImgError] = useState(false);
    
    const initials = useMemo(() => {
        if (!user?.username) return '?';
        return user.username.charAt(0).toUpperCase();
    }, [user?.username]);

    const bgColor = useMemo(() => {
        const deepColors = [
            '#1A237E', '#0D47A1', '#01579B', '#006064', '#004D40', 
            '#1B5E20', '#33691E', '#827717', '#BF360C', '#3E2723', 
            '#311B92', '#4A148C', '#880E4F', '#B71C1C'
        ];
        let hash = 0;
        const name = user?.username || "Guest";
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return deepColors[Math.abs(hash) % deepColors.length];
    }, [user?.username]);

    if (user?.picture && !imgError) {
        return (
            <img 
                src={user.picture} 
                alt="profile" 
                className="avatar" 
                onError={() => setImgError(true)} 
            />
        );
    }

    return (
        <div className="avatar initial-avatar" style={{ backgroundColor: bgColor }}>
            {initials}
        </div>
    );
};

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
                <NavLink to="/history" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <History size={19} />
                    <span>History</span>
                </NavLink>

                <span className="nav-section-label">Tools</span>
                <NavLink to="/ai-detection" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <Sparkles size={19} />
                    <span>AI Content Detection</span>
                </NavLink>

                <NavLink to="/deepfake-detection" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <ScanEye size={19} />
                    <span>Deepfake Detection</span>
                </NavLink>

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
                    <UserAvatar user={user} />
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
