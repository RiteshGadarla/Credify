import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, HelpCircle, Loader2, Scale, Sparkles, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ClaimCard.css';

const ClaimCard = ({ claimData, index = 0 }) => {
    const [expanded, setExpanded] = useState(false);
    
    const getVerdictInfo = (verdict) => {
        if (verdict === 'TRUE') return { icon: <CheckCircle2 className="verdict-icon true" />, color: 'var(--success)', label: 'Verified True', shield: <ShieldCheck size={14} /> };
        if (verdict === 'FALSE') return { icon: <XCircle className="verdict-icon false" />, color: 'var(--danger)', label: 'Verified False', shield: <ShieldAlert size={14} /> };
        return { icon: <HelpCircle className="verdict-icon uncertain" />, color: 'var(--warning)', label: 'Inconclusive', shield: <ShieldQuestion size={14} /> };
    };
    
    const isCompleted = claimData.status === 'Completed';
    const verdictInfo = isCompleted ? getVerdictInfo(claimData.verdict) : null;
    const confidence = claimData.confidence ? (claimData.confidence * 100) : 0;
    const confidenceLevel = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';

    return (
        <div className={`claim-card ${isCompleted ? claimData.verdict?.toLowerCase() : 'pending'}`}>
            <div className="claim-header" onClick={() => setExpanded(!expanded)}>
                <div className="claim-header-main">
                    <h4>
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginRight: '0.4rem', fontSize: '0.82rem' }}>
                            Claim {index + 1}:
                        </span>
                        {claimData.claim}
                    </h4>
                    <div className="claim-status-badges">
                        <span className="status-badge">{claimData.status}</span>
                        {isCompleted && verdictInfo && (
                            <>
                                <span className="verdict-wrapper" style={{ color: verdictInfo.color }}>
                                    {verdictInfo.icon}
                                    <strong className="verdict-text">{verdictInfo.label}</strong>
                                </span>
                                <span className="conf">
                                    {confidence.toFixed(0)}% confidence
                                </span>
                            </>
                        )}
                    </div>
                    {isCompleted && (
                        <div className="confidence-visual">
                            <div className="confidence-bar">
                                <div
                                    className={`confidence-bar-fill ${confidenceLevel}`}
                                    style={{ width: `${confidence}%` }}
                                ></div>
                            </div>
                            <span className={`confidence-percent`} style={{ 
                                color: confidenceLevel === 'high' ? 'var(--success)' : confidenceLevel === 'medium' ? 'var(--warning)' : 'var(--danger)' 
                            }}>
                                {confidence.toFixed(0)}%
                            </span>
                        </div>
                    )}
                </div>
                <button className="expand-btn" aria-label="Expand details">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
            
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className="claim-details"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {isCompleted ? (
                            <>
                                {/* Judge's Reasoning */}
                                <div className="detail-section">
                                    <div className="detail-section-header">
                                        <Scale size={15} className="section-icon" />
                                        <h5>Judge's Reasoning</h5>
                                    </div>
                                    <div className="reasoning-box">
                                        <p>{claimData.reasoning}</p>
                                    </div>
                                </div>
                                
                                {/* AI Summary */}
                                {claimData.summary && (
                                    <div className="detail-section">
                                        <div className="detail-section-header">
                                            <Sparkles size={15} className="section-icon" />
                                            <h5>AI Summary</h5>
                                        </div>
                                        <div className="summary-box">
                                            <p>{claimData.summary}</p>
                                            {claimData.key_points && claimData.key_points.length > 0 && (
                                                <ul className="key-points-list">
                                                    {claimData.key_points.map((pt, i) => <li key={i}>{pt}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}


                                {/* Evidence */}
                                <div className="evidence-section">
                                    <h5>
                                        <ExternalLink size={14} />
                                        Sources & Credibility
                                    </h5>
                                    {claimData.key_evidence?.map((ev, i) => {
                                        const score = ev.credibility_score * 100;
                                        const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
                                        const scoreColor = level === 'high' ? 'var(--success)' : level === 'medium' ? 'var(--warning)' : 'var(--danger)';
                                        const scoreBg = level === 'high' ? 'var(--success-light)' : level === 'medium' ? 'var(--warning-light)' : 'var(--danger-light)';

                                        return (
                                            <div className="evidence-item" key={i}>
                                                <div className="ev-top-row">
                                                    <a href={ev.url} target="_blank" rel="noreferrer" className="ev-source">
                                                        <ExternalLink size={12} />
                                                        {ev.source}
                                                    </a>
                                                    <span className="ev-score" style={{ color: scoreColor, background: scoreBg }}>
                                                        {score.toFixed(0)}/100
                                                        <span className="ev-score-bar">
                                                            <span
                                                                className="ev-score-bar-fill"
                                                                style={{ width: `${score}%`, background: scoreColor }}
                                                            ></span>
                                                        </span>
                                                    </span>
                                                </div>
                                                <p className="ev-snippet">"{ev.snippet}"</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="pending-state">
                                <div className="pending-spinner-wrap">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Processing...</span>
                                </div>
                                <p>Running agentic pipeline — {claimData.status}</p>
                                {claimData.streaming_sources && claimData.streaming_sources.length > 0 && (
                                    <div className="streaming-sources">
                                        <div className="streaming-sources-title">Scanning sources</div>
                                        {claimData.streaming_sources.map((src, i) => (
                                            <div key={i} className="streaming-source-item">
                                                <span className="streaming-source-dot"></span>
                                                {src.url}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClaimCard;
