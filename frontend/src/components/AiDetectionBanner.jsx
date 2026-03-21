import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import './AiDetectionBanner.css';

/**
 * AiDetectionBanner
 * Displays the Winston AI text detection result as a banner above results.
 *
 * Props:
 *   detection {object} — the `ai_detection` field from the task document
 */
const AiDetectionBanner = ({ detection }) => {
  if (!detection || detection.skipped) return null;

  const humanScore = detection.human_score ?? 100;
  const aiScore = detection.ai_score ?? 0;
  const isAi = detection.is_ai_generated;
  const hasAttack =
    detection.attack_detected?.zero_width_space ||
    detection.attack_detected?.homoglyph_attack;

  // Determine band
  const getBand = (score) => {
    if (score >= 80) return 'human';      // Very likely human
    if (score >= 50) return 'mixed';      // Uncertain
    return 'ai';                          // Very likely AI
  };
  const band = getBand(humanScore);

  const bandConfig = {
    human: {
      label: 'Likely Human-Written',
      sublabel: 'Winston AI found no strong indicators of synthetic content.',
      icon: <ShieldCheck size={20} />,
      barColor: 'var(--success)',
      accentClass: 'adb-human',
    },
    mixed: {
      label: 'Mixed Signals Detected',
      sublabel: 'Some AI-like patterns found. Treat results with caution.',
      icon: <Info size={20} />,
      barColor: 'var(--warning)',
      accentClass: 'adb-mixed',
    },
    ai: {
      label: 'AI-Generated Content Flagged',
      sublabel: 'Winston AI strongly suspects this text is synthetic or AI-written.',
      icon: <ShieldAlert size={20} />,
      barColor: 'var(--danger)',
      accentClass: 'adb-ai',
    },
  };

  const config = bandConfig[band];

  return (
    <AnimatePresence>
      <motion.div
        className={`ai-detection-banner ${config.accentClass}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35 }}
      >
        {/* Top Row */}
        <div className="adb-header">
          <div className="adb-icon-wrap">{config.icon}</div>
        <div className="adb-title-block">
            <span className="adb-label">{config.label}</span>
        </div>
          <div className="adb-scores">
            <div className="adb-score-chip human-chip">
              <User size={12} />
              <span className="adb-score-num">{humanScore.toFixed(0)}%</span>
              <span className="adb-score-desc">Human</span>
            </div>
            <div className="adb-score-chip ai-chip">
              <Bot size={12} />
              <span className="adb-score-num">{aiScore.toFixed(0)}%</span>
              <span className="adb-score-desc">AI</span>
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="adb-bar-wrap">
          <div className="adb-bar-track">
            <div
              className="adb-bar-human"
              style={{ width: `${humanScore}%` }}
            />
          </div>
          <div className="adb-bar-labels">
            <span style={{ color: 'var(--success)' }}>
              <User size={10} /> Human
            </span>
            <span style={{ color: 'var(--danger)' }}>
              AI <Bot size={10} />
            </span>
          </div>
        </div>

        {/* Sub-label + attack warnings */}
        <p className="adb-sublabel">{config.sublabel}</p>

        {hasAttack && (
          <div className="adb-attack-row">
            <AlertTriangle size={13} />
            <span>
              Manipulation detected:{' '}
              {[
                detection.attack_detected.zero_width_space && 'Zero-width characters',
                detection.attack_detected.homoglyph_attack && 'Homoglyph substitution',
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}


      </motion.div>
    </AnimatePresence>
  );
};

export default AiDetectionBanner;
