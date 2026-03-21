import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    
    if (!user) return null;

    return (
        <aside className="app-sidebar">
            <div className="sidebar-brand">
                <CheckCircle size={28} className="brand-icon" />
                <h2>Credify</h2>
            </div>
            
            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/fact-check" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                    <CheckCircle size={20} />
                    <span>Fact Check</span>
                </NavLink>
                <div className="nav-item disabled" style={{opacity: 0.5, cursor: 'not-allowed'}} title="Coming Soon">
                    <CheckCircle size={20} />
                    <span>AI Detection</span>
                </div>
                <div className="nav-item disabled" style={{opacity: 0.5, cursor: 'not-allowed'}} title="Coming Soon">
                    <CheckCircle size={20} />
                    <span>Deepfake Detection</span>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    {user.picture ? (
                        <img src={user.picture} alt="profile" className="avatar" />
                    ) : (
                        <div className="avatar fallback"><User size={20} /></div>
                    )}
                    <span className="username">{user.username}</span>
                </div>
                <button onClick={logout} className="logout-btn">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
