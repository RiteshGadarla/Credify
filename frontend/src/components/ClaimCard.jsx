import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import './ClaimCard.css';

const ClaimCard = ({ claimData }) => {
    const [expanded, setExpanded] = useState(false);
    
    // claimData: { claim, status, verdict, confidence, reasoning, key_evidence, proponent, opponent }
    
    const getVerdictIcon = (verdict) => {
        if (verdict === 'TRUE') return <CheckCircle className="icon true" />;
        if (verdict === 'FALSE') return <XCircle className="icon false" />;
        return <HelpCircle className="icon uncertain" />;
    };
    
    const isCompleted = claimData.status === 'Completed';

    return (
        <div className={`claim-card ${isCompleted ? claimData.verdict?.toLowerCase() : 'pending'}`}>
            <div className="claim-header" onClick={() => setExpanded(!expanded)}>
                <div className="claim-header-main">
                    <h4>{claimData.claim}</h4>
                    <div className="claim-status-badges">
                        <span className="status-badge">{claimData.status}</span>
                        {isCompleted && (
                            <span className="verdict-wrapper">
                                {getVerdictIcon(claimData.verdict)}
                                <strong>
                                    {claimData.verdict === 'UNCERTAIN' || claimData.verdict === 'CONFLICT' 
                                        ? 'INCONCLUSIVE / UNCERTAIN' 
                                        : claimData.verdict}
                                </strong>
                                <span className="conf" title="System Confidence in this Verdict">
                                    (Confidence: {(claimData.confidence * 100).toFixed(0)}%)
                                </span>
                            </span>
                        )}
                    </div>
                </div>
                <button className="expand-btn">
                    {expanded ? <ChevronUp /> : <ChevronDown />}
                </button>
            </div>
            
            {expanded && (
                <div className="claim-details">
                    {isCompleted ? (
                        <>
                            <div className="reasoning-box">
                                <strong>Judge's Reasoning:</strong>
                                <p>{claimData.reasoning}</p>
                            </div>
                            
                            {claimData.summary && (
                                <div className="reasoning-box" style={{ background: 'var(--bg-sub)' }}>
                                    <strong>AI Summary:</strong>
                                    <p>{claimData.summary}</p>
                                    {claimData.key_points && claimData.key_points.length > 0 && (
                                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                                            {claimData.key_points.map((pt, i) => <li key={i}>{pt}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                            
                            <div className="agents-split">
                                <div className="agent-col proponent">
                                    <h5>Proponent (Support)</h5>
                                    <ul>
                                        {claimData.proponent?.arguments?.map((arg, i) => (
                                            <li key={i}>{arg}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="agent-col opponent">
                                    <h5>Opponent (Challenge)</h5>
                                    <ul>
                                        {claimData.opponent?.arguments?.map((arg, i) => (
                                            <li key={i}>{arg}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="evidence-section">
                                <h5>Key Evidence & Credibility</h5>
                                {claimData.key_evidence?.map((ev, i) => {
                                    const score = ev.credibility_score * 100;
                                    let scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#d97706' : '#ef4444';
                                    let scoreBg = score >= 70 ? '#d1fae5' : score >= 40 ? '#fef3c7' : '#fee2e2';

                                    return (
                                        <div className="evidence-item" key={i}>
                                            <a href={ev.url} target="_blank" rel="noreferrer" className="ev-source">
                                                <span style={{marginRight: '0.4rem'}}>🌐</span>{ev.source}
                                            </a>
                                            <span className="ev-score" style={{ color: scoreColor, backgroundColor: scoreBg, border: `1px solid ${scoreColor}80` }}>
                                                Credibility: {score.toFixed(0)}/100
                                            </span>
                                            <p className="ev-snippet">"{ev.snippet}"</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="pending-state">
                            <p>Executing agentic pipeline... ({claimData.status})</p>
                            {claimData.streaming_sources && claimData.streaming_sources.length > 0 && (
                                <div className="streaming-sources">
                                    <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Scanning sources:</p>
                                    <ul style={{listStyle: 'none', padding: 0, marginTop: '0.5rem'}}>
                                        {claimData.streaming_sources.map((src, i) => (
                                            <li key={i} style={{fontSize: '0.85rem', marginBottom: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                <span style={{color: 'var(--primary)', marginRight: '0.3rem'}}>⟳</span> {src.url}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClaimCard;
