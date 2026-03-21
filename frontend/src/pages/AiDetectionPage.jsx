import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { scanTextForAi } from '../api/factCheck';
import {
  Bot, User, Sparkles, Loader2, AlertTriangle, ShieldCheck, ShieldAlert,
  Info, Zap, BarChart2, Eye, RefreshCw, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AiDetectionPage.css';

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
    cls: 'band-human',
  },
  mixed: {
    label: 'Mixed Signals',
    desc: 'AI-like patterns detected. The text shows characteristics of both human and AI writing.',
    icon: Info,
    accent: 'var(--warning)',
    accentLight: 'var(--warning-light)',
    cls: 'band-mixed',
  },
  ai: {
    label: 'AI-Generated Content',
    desc: 'This text was likely written or significantly assisted by an AI model.',
    icon: ShieldAlert,
    accent: 'var(--danger)',
    accentLight: 'var(--danger-light)',
    cls: 'band-ai',
  },
};

/* ── Sub-components ─────────────────────────────────────── */
const ScoreGauge = ({ humanScore }) => {
  const band = getBand(humanScore);
  const config = BAND_CONFIG[band];
  const aiScore = 100 - humanScore;

  // Full-circle donut: start at 12 o'clock (270deg), sweep clockwise.
  // humanScore% of 360deg = human arc, remainder = AI arc.
  const startDeg = 270;
  const humanPercent = humanScore;        // e.g. 98.5% → 624.6deg

  return (
    <div className="score-gauge-wrap">
      <div className="gauge-donut-circle" style={{
        background: `conic-gradient(
  from ${startDeg}deg,
  ${config.accent} 0% ${humanPercent}%,
  rgba(239,83,80,0.35) ${humanPercent}%,
  rgba(239,83,80,0.15) 100%
)`
      }}>
        <div className="gauge-hole-circle">
          <span className="gauge-num" style={{ color: config.accent }}>{humanScore.toFixed(1)}%</span>
          <span className="gauge-label">Human</span>
        </div>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div className="stat-pill" style={{ borderColor: `${color}33`, background: `${color}0d` }}>
    <span className="stat-pill-val" style={{ color }}>{value}</span>
    <span className="stat-pill-label">{label}</span>
  </div>
);

/* ── Main Component ─────────────────────────────────────── */
const AiDetectionPage = () => {
  const [text, setText] = useState('');

  const { mutate, isPending, data: result, reset } = useMutation({
    mutationFn: () => scanTextForAi(text),
  });

  const handleScan = () => {
    if (!text.trim() || isPending) return;
    mutate();
  };

  const handleReset = () => {
    setText('');
    reset();
  };

  const band = result && !result.skipped ? getBand(result.human_score) : null;
  const config = band ? BAND_CONFIG[band] : null;
  const BandIcon = config?.icon;

  return (
    <div className="aid-page">
      {/* ── Header ── */}
      <motion.div className="aid-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="aid-header-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <h1>AI Content Detection</h1>
          <p>Detect AI-generated text instantly</p>
        </div>
      </motion.div>

      {/* ── Input Card ── */}
      <motion.div
        className="aid-input-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
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
        <div className="aid-input-actions">
          {result && (
            <button className="aid-reset-btn" onClick={handleReset}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
          <button
            className="aid-scan-btn"
            onClick={handleScan}
            disabled={isPending || !text.trim()}
          >
            {isPending ? (
              <><Loader2 size={15} className="spin" /> Scanning…</>
            ) : (
              <><Zap size={15} /> Scan for AI</>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Results ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="aid-results"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.35 }}
          >
            {result.skipped ? (
              /* Skip state */
              <div className={`aid-result-card band-mixed`}>
                <div className="aid-result-header">
                  <div className="aid-result-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="aid-result-title">Detection Skipped</p>
                    <p className="aid-result-desc">{result.skip_reason || 'Detection was skipped.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Full result */
              <div className={`aid-result-card ${config.cls}`}>
                {/* Verdict header */}
                <div className="aid-result-header">
                  <div className="aid-result-icon-wrap" style={{ background: config.accentLight, color: config.accent }}>
                    <BandIcon size={20} />
                  </div>
                  <div className="aid-result-title-block">
                    <p className="aid-result-title" style={{ color: config.accent }}>{config.label}</p>
                    <p className="aid-result-desc">{config.desc}</p>
                  </div>
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

                {/* Score bar */}
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
                    Longer bars toward the left indicate more human-like writing.
                  </div>
                </div>

                {/* Attack warnings */}
                {(result.attack_detected?.zero_width_space || result.attack_detected?.homoglyph_attack) && (
                  <div className="aid-attacks">
                    <div className="aid-attack-header">
                      <AlertTriangle size={14} />
                      <span>Manipulation Attacks Detected</span>
                    </div>
                    <div className="aid-attack-items">
                      {result.attack_detected.zero_width_space && (
                        <div className="aid-attack-item">
                          <ChevronRight size={12} />
                          Zero-width space characters — invisible characters that interfere with detection
                        </div>
                      )}
                      {result.attack_detected.homoglyph_attack && (
                        <div className="aid-attack-item">
                          <ChevronRight size={12} />
                          Homoglyph substitution — visually similar characters used to evade scanners
                        </div>
                      )}
                    </div>
                  </div>
                )}


              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {!result && !isPending && (
        <motion.div className="aid-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="aid-empty-icon"><Bot size={36} /></div>
          <h3>Detect AI-Written Content</h3>
          <p>
            Paste any text above and click <strong>Scan for AI</strong>. The detection engine will analyze it
            and return a human vs. AI confidence score.
          </p>
          <ul className="aid-tips">
            <li><ChevronRight size={12} /> Use at least 600 characters for the most reliable results</li>
            <li><ChevronRight size={12} /> Works on articles, academic papers, social posts, and more</li>
            <li><ChevronRight size={12} /> Detection runs before fact-checking when you submit queries</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default AiDetectionPage;
