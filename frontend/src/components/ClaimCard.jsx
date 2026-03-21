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
                                <strong>{claimData.verdict}</strong>
                                <span className="conf">({(claimData.confidence * 100).toFixed(0)}%)</span>
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
                                {claimData.key_evidence?.map((ev, i) => (
                                    <div className="evidence-item" key={i}>
                                        <a href={ev.url} target="_blank" rel="noreferrer" className="ev-source">{ev.source}</a>
                                        <span className="ev-score">Credibility: {(ev.credibility_score * 100).toFixed(0)}/100</span>
                                        <p className="ev-snippet">"{ev.snippet}"</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="pending-state">
                            <p>Executing agentic pipeline... ({claimData.status})</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClaimCard;
