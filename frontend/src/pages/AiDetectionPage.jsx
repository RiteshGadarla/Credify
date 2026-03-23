import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scanTextForAi, generateReport } from '../api/factCheck';
import {
  Bot, User, Sparkles, Loader2, AlertTriangle, ShieldCheck, ShieldAlert,
  Info, Zap, BarChart2, Eye, RefreshCw, ChevronRight, CheckCircle2,
  FileText, RotateCcw, Radar, Shield, Download, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleSpeech } from '../utils/tts';
import './AiDetectionPage.css';
import '../components/TTSButton.css';

/* ── Helpers ──────────────────────────────────────────────── */
const getBand = (humanScore) => {
  if (humanScore >= 80) return 'human';
  if (humanScore >= 50) return 'mixed';
  return 'ai';
};

const BAND_CONFIG = {
  human: {
    label: 'Likely Human-Written',
    desc: 'No strong indicators of synthetic or AI-generated content were found.',
    icon: ShieldCheck,
    accent: 'var(--success)',
    accentLight: 'var(--success-light)',
    cls: 'aid-band-human',
  },
  mixed: {
    label: 'Mixed Signals',
    desc: 'AI-like patterns detected. The text shows characteristics of both human and AI writing.',
    icon: Info,
    accent: 'var(--warning)',
    accentLight: 'var(--warning-light)',
    cls: 'aid-band-mixed',
  },
  ai: {
    label: 'AI-Generated Content',
    desc: 'This text was likely written or significantly assisted by an AI model.',
    icon: ShieldAlert,
    accent: 'var(--danger)',
    accentLight: 'var(--danger-light)',
    cls: 'aid-band-ai',
  },
};

/* ── Sub-components ─────────────────────────────────────── */
const ScoreGauge = ({ humanScore }) => {
  const band = getBand(humanScore);
  const config = BAND_CONFIG[band];

  // Full-circle donut
  const startDeg = 270;
  const humanPercent = humanScore;

  return (
    <div className="aid-score-gauge-wrap">
      <div className="aid-gauge-donut-circle" style={{
        background: `conic-gradient(
  from ${startDeg}deg,
  ${config.accent} 0% ${humanPercent}%,
  rgba(239,83,80,0.35) ${humanPercent}%,
  rgba(239,83,80,0.15) 100%
)`
      }}>
        <div className="aid-gauge-hole-circle">
          <span className="aid-gauge-num" style={{ color: config.accent }}>{humanScore.toFixed(1)}%</span>
          <span className="aid-gauge-label">Human</span>
        </div>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div className="aid-stat-pill" style={{ borderColor: `${color}33`, background: `${color}0d` }}>
    <span className="aid-stat-pill-val" style={{ color }}>{value}</span>
    <span className="aid-stat-pill-label">{label}</span>
  </div>
);

/* ── Main Component ─────────────────────────────────────── */
const AiDetectionPage = () => {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  
  // phase: 'input' | 'processing' | 'complete'
  const [phase, setPhase] = useState('input');
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    const handleStateChange = (e) => {
      const { id, speaking } = e.detail;
      if (id && id.startsWith('aid-') && speaking) setSpeakingId(id);
      else if (!speaking && speakingId === id) setSpeakingId(null);
      else if (speaking && id && !id.startsWith('aid-')) setSpeakingId(null);
    };
    window.addEventListener('tts-state-change', handleStateChange);
    return () => window.removeEventListener('tts-state-change', handleStateChange);
  }, [speakingId]);

  const { mutate, isPending, data: result, isError, error } = useMutation({
    mutationFn: () => scanTextForAi(text),
    onMutate: () => {
      setPhase('processing');
    },
    onSuccess: () => {
      setPhase('complete');
    },
    onError: () => {
      setPhase('complete'); // or input, but complete with error is fine
    }
  });

  const handleScan = () => {
    if (!text.trim() || isPending) return;
    mutate();
  };

  const handleNewScan = useCallback(() => {
    setText('');
    setPhase('input');
    queryClient.removeQueries({ queryKey: ['scanTextForAi'] });
  }, [queryClient]);

  const getInputSummary = () => {
    return text.length > 120 ? text.substring(0, 120) + '…' : text;
  };

  const showInput = phase === 'input';
  const showProcess = phase === 'processing' || phase === 'complete';

  const band = result && !result.skipped ? getBand(result.human_score) : null;
  const config = band ? BAND_CONFIG[band] : null;
  const BandIcon = config?.icon;

  return (
    <div className="aid-command-centre">
      {/* Command Centre Header */}
      <motion.div
        className="aid-cc-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="aid-cc-header-left">
          <div className="aid-cc-logo-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h1>AI Content Detection</h1>
            <p>Real-time synthetic text analysis</p>
          </div>
        </div>
        {showProcess && (
          <motion.div
            className="aid-cc-status-indicator"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className={`aid-cc-status-dot ${isPending ? 'active' : isError ? 'failed' : 'done'}`} />
            <span className="aid-cc-status-text">
              {isPending ? 'SCANNING' : isError ? 'FAILED' : 'COMPLETE'}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ============ INPUT PHASE ============ */}
      <AnimatePresence mode="wait">
        {showInput && (
          <motion.div
            key="input-phase"
            className="aid-input-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="aid-input-header">
              <Eye size={15} />
              <span>Paste text to analyze</span>
              <span className="aid-char-count">{text.length} chars {text.length < 300 && text.length > 0 && <span className="aid-warn-short">(min 300 for reliable results)</span>}</span>
            </div>
            
            <textarea
              className="aid-textarea"
              placeholder="Paste any article, paragraph, or statement here…&#10;&#10;Minimum 300 characters for reliable detection. Longer samples produce more accurate results."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
            />
            
            <div className="aid-input-footer">
              <div className="aid-instructions">
                <ChevronRight size={14} /> Provide at least 300 characters for the pipeline to function precisely.

              </div>
              <button
                className="aid-scan-btn"
                onClick={handleScan}
                disabled={!text.trim() || text.length < 50}
              >
                <Zap size={16} /> Scan for AI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ PROCESSING / COMPLETE PHASE ============ */}
      <AnimatePresence>
        {showProcess && (
          <motion.div
            key="process-phase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Collapsed Input Summary */}
            <motion.div
              className="aid-input-summary"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.1 }}
            >
              <div className="aid-input-summary-inner">
                <div className="aid-input-summary-badge">
                  <FileText size={14} />
                  <span>TEXT</span>
                </div>
                <span className="aid-input-summary-text">{getInputSummary()}</span>
              </div>
            </motion.div>

            {/* Error State */}
            {isError && (
              <motion.div
                className="aid-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="aid-error-content">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>Scan Failed</h4>
                    <p>{error?.message || 'An error occurred during analysis.'}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing State */}
            {isPending && (
              <motion.div 
                className="aid-processing-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="aid-radar-wrap">
                  <Radar size={40} className="aid-radar-icon" />
                  <div className="aid-radar-pulse-ring" />
                </div>
                <h3>Scanning syntax patterns...</h3>
                <p>Analyzing perplexity and burstiness against known AI models.</p>
                <div className="aid-processing-bar-wrap">
                  <div className="aid-processing-bar" />
                </div>
              </motion.div>
            )}

            {/* Full Results */}
            {!isPending && result && (
              <motion.div
                className="aid-results-container"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                 {result.skipped ? (
                  /* Skip state */
                  <div className={`aid-result-card aid-band-mixed`}>
                    <div className="aid-result-header">
                      <div className="aid-result-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                        <Info size={24} />
                      </div>
                      <div className="aid-result-title-block">
                        <p className="aid-result-title">Detection Skipped</p>
                        <p className="aid-result-desc">{result.skip_reason || 'Detection was skipped due to insufficient or invalid length.'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Full detection result */
                  <div className={`aid-result-card ${config.cls}`}>
                    {/* Verdict header */}
                    <div className="aid-result-header">
                      <div className="aid-result-icon-wrap" style={{ background: config.accentLight, color: config.accent }}>
                        <BandIcon size={28} />
                      </div>
                      <div className="aid-result-title-block">
                        <p className="aid-result-title" style={{ color: config.accent }}>{config.label}</p>
                        <p className="aid-result-desc">{config.desc}</p>
                      </div>
                      <button 
                        className={`tts-speaker-btn ${speakingId === 'aid-result' ? 'active' : ''}`}
                        onClick={() => toggleSpeech('aid-result', `${config.label}. ${config.desc}`)}
                        title="Read result aloud"
                        style={{ marginLeft: '1rem' }}
                      >
                        {speakingId === 'aid-result' ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    </div>

                    {/* Gauge + stats */}
                    <div className="aid-scores-layout">
                      <ScoreGauge humanScore={result.human_score} />

                      <div className="aid-stat-pills">
                        <StatPill label="Human Score" value={`${result.human_score.toFixed(1)}%`} color="var(--success)" />
                        <StatPill label="AI Score" value={`${result.ai_score.toFixed(1)}%`} color="var(--danger)" />
                        <StatPill label="Readability" value={`${result.readability_score.toFixed(0)}`} color="var(--primary-dark)" />
                        {result.language && result.language !== 'unknown' && (
                          <StatPill label="Language" value={result.language.toUpperCase()} color="var(--text-secondary)" />
                        )}
                      </div>
                    </div>

                    {/* Score Distribution Bar */}
                    <div className="aid-bar-section">
                      <div className="aid-bar-labels-top">
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} /> Human
                        </span>
                        <span className="aid-bar-mid-label">
                          <BarChart2 size={12} /> Score Distribution
                        </span>
                        <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          AI <Bot size={12} />
                        </span>
                      </div>
                      <div className="aid-bar-track">
                        <motion.div
                          className="aid-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${result.human_score}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <div className="aid-bar-footnote">
                        Longer bars toward the left indicate more human-like writing structure.
                      </div>
                    </div>

                    {/* Attack warnings */}
                    {(result.attack_detected?.zero_width_space || result.attack_detected?.homoglyph_attack) && (
                      <div className="aid-attacks">
                        <div className="aid-attack-header">
                          <AlertTriangle size={15} />
                          <span>Manipulation Attacks Detected</span>
                        </div>
                        <div className="aid-attack-items">
                          {result.attack_detected.zero_width_space && (
                            <div className="aid-attack-item">
                              <ChevronRight size={14} />
                              Zero-width space characters — invisible characters inserted to confuse detection.
                            </div>
                          )}
                          {result.attack_detected.homoglyph_attack && (
                            <div className="aid-attack-item">
                              <ChevronRight size={14} />
                              Homoglyph substitution — visually identical spoof characters.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* New Scan Button */}
            {(!isPending && (result || isError)) && (
              <motion.div
                className="aid-new-scan-wrap"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="aid-new-scan-btn" onClick={handleNewScan}>
                    <RotateCcw size={18} />
                    New Scan
                  </button>
                  {result && !result.skipped && (
                    <button 
                      className="aid-new-scan-btn" 
                      style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                      onClick={() => generateReport('ai_detection', { text, result })}
                    >
                      <Download size={18} />
                      Generate Report
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state (on initial load before interaction) ── */}
      {showInput && !text.trim() && (
        <motion.div 
          className="aid-welcome" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="aid-welcome-grid">
             <div className="aid-welcome-item">
               <div className="aid-wi-icon"><ShieldCheck size={20} /></div>
               <div className="aid-wi-text">
                 <h5>Robust Models</h5>
                 <p>Distinguishes human nuance from machine generated text using advanced patterns.</p>
               </div>
             </div>
             <div className="aid-welcome-item">
               <div className="aid-wi-icon"><BarChart2 size={20} /></div>
               <div className="aid-wi-text">
                 <h5>Detailed Scoring</h5>
                 <p>Provides an exact confidence score with readability and adversarial attack detection.</p>
               </div>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AiDetectionPage;
