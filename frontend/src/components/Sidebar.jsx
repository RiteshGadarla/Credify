import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Sparkles, ScanEye, LogOut, User, ShieldCheck, Type, History, Languages, ChevronDown, Check } from 'lucide-react';
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

    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const [selectedLang, setSelectedLang] = useState(() => {
        return localStorage.getItem('selectedLang') || 'en';
    });
    const langDropdownRef = useRef(null);

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
        { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
        { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
        { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
        { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
    ];

    const handleLanguageChange = (langCode) => {
        setSelectedLang(langCode);
        localStorage.setItem('selectedLang', langCode);
        setLangDropdownOpen(false);

        // Trigger Google Translate
        if (langCode === 'en') {
            // Reset to original language
            const iframe = document.querySelector('.goog-te-banner-frame');
            if (iframe) {
                const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                const restoreBtn = innerDoc.querySelector('.goog-te-button button');
                if (restoreBtn) restoreBtn.click();
            }
            // Also try cookie-based reset
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
            window.location.reload();
        } else {
            // Set the translate cookie
            document.cookie = `googtrans=/en/${langCode}; path=/;`;
            document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname}`;
            
            // Try to use the Google Translate select element
            const gtCombo = document.querySelector('.goog-te-combo');
            if (gtCombo) {
                gtCombo.value = langCode;
                gtCombo.dispatchEvent(new Event('change'));
            } else {
                // If widget hasn't loaded yet, reload with cookie set
                window.location.reload();
            }
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
                setLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

                {/* Language Switcher */}
                <div className="lang-switcher-wrapper" ref={langDropdownRef}>
                    <div 
                        className={`nav-item lang-trigger ${langDropdownOpen ? 'active' : ''}`}
                        onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                        style={{cursor: 'pointer'}}
                    >
                        <Languages size={19} />
                        <span>Language</span>
                        <span className="lang-current-badge notranslate">
                            {languages.find(l => l.code === selectedLang)?.label || 'English'}
                        </span>
                        <ChevronDown size={14} className={`lang-chevron ${langDropdownOpen ? 'open' : ''}`} />
                    </div>
                    {langDropdownOpen && (
                        <div className="lang-dropdown">
                            {languages.map(lang => (
                                <div
                                    key={lang.code}
                                    className={`lang-option ${selectedLang === lang.code ? 'selected' : ''}`}
                                    onClick={() => handleLanguageChange(lang.code)}
                                >
                                    <span className="lang-flag">{lang.flag}</span>
                                    <span className="lang-label notranslate">{lang.label}</span>
                                    {selectedLang === lang.code && <Check size={14} className="lang-check" />}
                                </div>
                            ))}
                        </div>
                    )}
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
