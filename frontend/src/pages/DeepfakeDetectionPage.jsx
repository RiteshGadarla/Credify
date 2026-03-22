import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scanMediaForDeepfake, generateReport } from '../api/factCheck';
import {
  ScanEye, ShieldCheck, ShieldAlert, Info, Loader2,
  UploadCloud, RefreshCw, Film, Image, Music, ChevronRight,
  Zap, AlertTriangle, FileQuestion, Radar, Download, CheckCircle2,
  AlertCircle, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleSpeech } from '../utils/tts';
import './DeepfakeDetectionPage.css';
import '../components/TTSButton.css';

/* ── Helpers ──────────────────────────────────────────────────── */
const getBand = (status) => {
  if (status === 'AUTHENTIC') return 'human';
  if (status === 'FAKE') return 'ai';
  return 'mixed';
};

const BAND_CONFIG = {
  human: {
    label: 'Authentic Media',
    icon: ShieldCheck,
    accent: 'var(--success)',
    accentLight: 'var(--success-light)',
    cls: 'band-human',
  },
  mixed: {
    label: 'Suspicious / Uncertain',
    icon: Info,
    accent: 'var(--warning)',
    accentLight: 'var(--warning-light)',
    cls: 'band-mixed',
  },
  ai: {
    label: 'Deepfake Detected',
    icon: ShieldAlert,
    accent: 'var(--danger)',
    accentLight: 'var(--danger-light)',
    cls: 'band-ai',
  },
};

const getConfidence = (score, status) => {
  const distance = Math.abs(score - 50);
  if (distance >= 35) return { level: 'High', color: status === 'AUTHENTIC' ? 'var(--success)' : 'var(--danger)' };
  if (distance >= 18) return { level: 'Moderate', color: 'var(--warning)' };
  return { level: 'Low', color: 'var(--text-tertiary)' };
};

const getInterpretation = (status, score, mediaType) => {
  const type = (mediaType || 'media').toLowerCase();
  const confidence = getConfidence(score, status);

  if (status === 'AUTHENTIC') {
    if (confidence.level === 'High')
      return `This ${type} shows no meaningful signs of AI generation or digital manipulation. The analysis is highly confident it is authentic.`;
    if (confidence.level === 'Moderate')
      return `This ${type} appears authentic, though the confidence margin is moderate. Consider cross-verifying the source before drawing firm conclusions.`;
    return `No strong deepfake markers were found, but confidence is low — the score sits close to the uncertain boundary. Use additional context to verify.`;
  }

  if (status === 'FAKE') {
    if (confidence.level === 'High')
      return `This ${type} shows strong, consistent markers of AI generation or deepfake manipulation. The analysis is highly confident it is synthetic.`;
    if (confidence.level === 'Moderate')
      return `Significant deepfake indicators were detected. While confidence is moderate, this ${type} should be treated as potentially synthetic until verified.`;
    return `Some deepfake markers were detected but confidence is low — the result is borderline. Exercise caution and seek additional verification.`;
  }

  if (status === 'SUSPICIOUS')
    return `Partial manipulation signals were found, but not enough to reach a definitive verdict. This ${type} warrants careful scrutiny before sharing or acting on it.`;

  return `The analysis could not produce a reliable verdict for this ${type}. This may be due to file quality, format limitations, or content that falls outside detection capabilities.`;
};

const MEDIA_TYPE_ICON = { IMAGE: Image, VIDEO: Film, AUDIO: Music };

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac',
  'audio/ogg', 'audio/flac', 'audio/mp4',
].join(',');

const PIPELINE_STEPS = [
  { key: 'upload', label: 'Media Handling', sublabel: 'Validating and parsing file', icon: UploadCloud },
  { key: 'scanning', label: 'Deep Scanning', sublabel: 'Analyzing for synthetic markers', icon: Radar },
  { key: 'evaluating', label: 'Evaluating Evidence', sublabel: 'Detecting manipulation clusters', icon: Info },
  { key: 'judging', label: 'Finalizing Verdict', sublabel: 'Synthesizing detection scores', icon: ShieldCheck },
];

/* ── Main Component ──────────────────────────────────────────── */
const DeepfakeDetectionPage = () => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState('input'); // 'input' | 'processing' | 'complete'
  const [pipelineStep, setPipelineStep] = useState(0);
  const [speakingId, setSpeakingId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleStateChange = (e) => {
      const { id, speaking } = e.detail;
      if (id && id.startsWith('dfd-') && speaking) setSpeakingId(id);
      else if (!speaking && speakingId === id) setSpeakingId(null);
      else if (speaking && id && !id.startsWith('dfd-')) setSpeakingId(null);
    };
    window.addEventListener('tts-state-change', handleStateChange);
    return () => window.removeEventListener('tts-state-change', handleStateChange);
  }, [speakingId]);

  const { mutate, isPending, data: result, reset, error, isError } = useMutation({
    mutationFn: () => scanMediaForDeepfake(file),
    onSuccess: () => {
      // Small delay to show last step completion
      setTimeout(() => setPhase('complete'), 500);
    },
    onError: () => {
      setPhase('complete');
    }
  });

  // Pipeline simulation logic
  useEffect(() => {
    let interval;
    if (isPending) {
      setPipelineStep(0);
      interval = setInterval(() => {
        setPipelineStep(s => Math.min(s + 1, 3));
      }, 3000);
    } else {
      setPipelineStep(result || error ? 4 : 0);
    }
    return () => clearInterval(interval);
  }, [isPending, result, error]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    reset();
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    setPhase('input');
  }, [reset]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    reset();
    setPhase('input');
    setPipelineStep(0);
  };

  const handleScan = () => {
    if (!file || isPending) return;
    setPhase('processing');
    mutate();
  };

  const isCompleted = !!result;
  const isFailed = !!error;

  const band = result && !result.skipped ? getBand(result.status) : null;
  const config = band ? BAND_CONFIG[band] : (isFailed ? BAND_CONFIG.ai : null);
  const BandIcon = config?.icon;

  const showInput = true; // Always show media
  const showProcess = phase === 'processing' || phase === 'complete';

  return (
    <div className="dfd-command-centre">
      {/* ── Header ── */}
      <motion.div
        className="dfd-cc-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="dfd-cc-header-left">
          <div className="dfd-cc-logo-icon">
            <ScanEye size={22} />
          </div>
          <div>
            <h1>Deepfake Analysis Engine</h1>
            <p>Detection of synthetic media & digital manipulation</p>
          </div>
        </div>
        {showProcess && (
          <motion.div
            className="dfd-cc-status-indicator"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className={`dfd-cc-status-dot ${isCompleted ? 'done' : isFailed ? 'failed' : 'active'}`} />
            <span className="dfd-cc-status-text">
              {isCompleted ? 'COMPLETE' : isFailed ? 'FAILED' : 'SCANNING'}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ============ INPUT PHASE ============ */}
      <AnimatePresence mode="wait">
        {showInput && (
          <motion.div
            key="input-phase"
            className="dfd-input-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className={`dfd-upload-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDrop={(e) => { if (phase === 'input') handleDrop(e); else e.preventDefault(); }}
              onDragOver={(e) => { e.preventDefault(); if (phase === 'input') setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !file && phase === 'input' && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])} />

              {file ? (
                <div className="dfd-file-preview">
                  {preview
                    ? <img src={preview} alt="preview" className="dfd-img-preview" />
                    : <div className="dfd-file-icon-wrap">
                      {file.type.startsWith('video/') ? <Film size={40} /> :
                        file.type.startsWith('audio/') ? <Music size={40} /> : <Image size={40} />}
                    </div>
                  }
                  <div className="dfd-file-meta">
                    <span className="dfd-file-name">{file.name}</span>
                    <span className="dfd-file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <div className="dfd-drop-area">
                  <div className="dfd-upload-icon"><UploadCloud size={34} /></div>
                  <p className="dfd-drop-title">Drop media or <span className="dfd-link">click to browse</span></p>
                  <p className="dfd-drop-sub">Images · Video · Audio &mdash; up to 250 MB</p>
                </div>
              )}
            </div>

            {phase === 'input' && (
              <div className="dfd-input-footer">
                <span className="dfd-char-count">
                  {file ? 'File selected · Ready for deep scan' : 'Supports JPEG, PNG, MP4, MOV, MP3, WAV'}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {file && (
                     <button className="dfd-reset-btn" onClick={handleReset}>
                     <RefreshCw size={14} /> Change
                   </button>
                  )}
                  <button
                    className="dfd-analyze-btn"
                    onClick={handleScan}
                    disabled={isPending || !file}
                  >
                    {isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Scanning...</>
                    ) : (
                      <><Zap size={16} /> Scan for Deepfakes</>
                    )}
                  </button>
                </div>
              </div>
            )}
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
            {/* Pipeline Command Centre Grid */}
            {!isCompleted && !isFailed && (
              <motion.div
                className="dfd-pipeline-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="dfd-pipeline-grid-header">
                  <div className="dfd-pipeline-title-row">
                    <Radar size={18} className="dfd-radar-icon" />
                    <h3>Scanning Pipeline</h3>
                  </div>
                  <div className="dfd-pipeline-progress-container">
                    <div className="dfd-pipeline-progress-bar">
                      <motion.div
                        className="dfd-pipeline-progress-fill"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min((pipelineStep / 4) * 100, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="dfd-pipeline-progress-text">{Math.round(Math.min((pipelineStep / 4) * 100, 100))}%</span>
                  </div>
                </div>

                <div className="dfd-pipeline-steps-grid">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    let state = 'waiting';
                    if (idx < pipelineStep) state = 'completed';
                    else if (idx === pipelineStep) state = 'active';

                    return (
                      <motion.div
                        key={step.key}
                        className={`dfd-pipeline-step-card ${state}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + idx * 0.1 }}
                      >
                        <div className={`dfd-step-icon-wrap ${state}`}>
                          {state === 'completed' ? (
                            <CheckCircle2 size={20} />
                          ) : state === 'active' ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Icon size={20} />
                          )}
                        </div>
                        <div className="dfd-step-info">
                          <div className={`dfd-step-label ${state}`}>{step.label}</div>
                          <div className="dfd-step-sublabel">{step.sublabel}</div>
                        </div>
                        {state === 'active' && (
                          <div className="dfd-step-pulse-ring" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Completed / Failed Banner */}
            {(isCompleted || isFailed) && (
              <motion.div
                className={`dfd-completion-banner ${isFailed ? 'failed' : 'success'}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="dfd-completion-icon">
                  {isCompleted ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                <div className="dfd-completion-info">
                  <h3>{isCompleted ? 'Scanning Complete' : 'Scanning Failed'}</h3>
                  <p>{isCompleted ? (result.skipped ? 'Detection skipped' : config.label) : 'An error occurred during scanning.'}</p>
                </div>
                <button 
                  className={`tts-speaker-btn ${speakingId === 'dfd-status' ? 'active' : ''}`}
                  onClick={() => toggleSpeech('dfd-status', `${isCompleted ? 'Scanning Complete' : 'Scanning Failed'}. ${isCompleted ? (result.skipped ? 'Detection skipped. ' + result.skip_reason : config.label) : 'An error occurred during scanning.'}`)}
                  title="Read status aloud"
                  style={{ marginRight: '1.5rem' }}
                >
                  {speakingId === 'dfd-status' ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className={`badge ${isCompleted ? (result.skipped ? 'badge-warning' : 'badge-success') : 'badge-danger'}`}>
                  {isCompleted ? (result.skipped ? 'SKIPPED' : result.status) : 'FAILED'}
                </span>
              </motion.div>
            )}

            {/* Results */}
            {result && !isPending && (
              <motion.div
                className="dfd-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {result.skipped ? (
                  <div className="dfd-result-card band-mixed">
                    <div className="dfd-result-header">
                      <div className="dfd-result-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                        <Info size={20} />
                      </div>
                      <div>
                        <p className="dfd-result-title">Detection Skipped</p>
                        <p className="dfd-result-desc">{result.skip_reason || 'Detection was skipped.'}</p>
                      </div>
                    </div>
                  </div>
                ) : (() => {
                  const displayScore = result.final_score;
                  const confidence = getConfidence(displayScore, result.status);
                  const interpretation = getInterpretation(result.status, displayScore, result.media_type);
                  const MediaIcon = MEDIA_TYPE_ICON[result.media_type] || FileQuestion;

                  return (
                    <div className={`dfd-result-card ${config.cls}`}>
                      <div className="dfd-result-header">
                        <div className="dfd-result-icon-wrap" style={{ background: config.accentLight, color: config.accent }}>
                          <BandIcon size={20} />
                        </div>
                        <div className="dfd-result-title-block">
                          <p className="dfd-result-title" style={{ color: config.accent }}>{config.label}</p>
                          <div className="dfd-confidence-row">
                            <span className="dfd-confidence-badge" style={{
                              color: confidence.color,
                              borderColor: `${confidence.color}44`,
                              background: `${confidence.color}0e`,
                            }}>
                              {confidence.level} Confidence
                            </span>
                            {result.media_type && result.media_type !== 'UNKNOWN' && (
                              <span className="dfd-meta-chip">
                                <MediaIcon size={11} /> {result.media_type}
                              </span>
                            )}
                            {result.original_filename && (
                              <span className="dfd-meta-chip">
                                {result.original_filename.length > 22
                                  ? result.original_filename.slice(0, 19) + '…'
                                  : result.original_filename}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="dfd-interpretation">
                        <p>{interpretation}</p>
                        <button 
                          className={`tts-speaker-btn ${speakingId === 'dfd-interpretation' ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleSpeech('dfd-interpretation', interpretation); }}
                          title="Read interpretation aloud"
                          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
                        >
                          {speakingId === 'dfd-interpretation' ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>

                      <div className="dfd-score-breakdown">
                        <div className="dfd-score-label-row">
                          <span className="dfd-score-label">Authenticity score</span>
                          <span className="dfd-score-value" style={{ color: config.accent }}>
                            {displayScore.toFixed(1)} / 100
                          </span>
                        </div>
                        <div className="dfd-score-track">
                          <motion.div
                            className="dfd-score-fill"
                            style={{ background: `linear-gradient(90deg, var(--danger), var(--warning) 50%, var(--success))` }}
                            initial={{ clipPath: 'inset(0 100% 0 0)' }}
                            animate={{ clipPath: `inset(0 ${100 - displayScore}% 0 0)` }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          />
                          <span className="dfd-track-marker" style={{ left: '30%' }} />
                          <span className="dfd-track-marker" style={{ left: '68%' }} />
                          <span className="dfd-track-needle" style={{ left: `${displayScore}%` }} />
                        </div>
                        <div className="dfd-score-zones">
                          <span style={{ color: 'var(--danger)' }}>Synthetic</span>
                          <span style={{ color: 'var(--warning)' }}>Uncertain</span>
                          <span style={{ color: 'var(--success)' }}>Authentic</span>
                        </div>
                        <p className="dfd-bar-footnote" style={{ marginTop: '0.4rem' }}>
                          Below 30 → likely synthetic · 30–68 → uncertain · above 68 → likely authentic
                        </p>
                      </div>

                      {(result.status === 'FAKE' || result.status === 'SUSPICIOUS') && (
                        <div className="dfd-caution-note">
                          <AlertTriangle size={13} />
                          <span>Do not share or act on this media without further verification from a trusted source.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* Error state */}
            {isError && (
              <motion.div
                className="dfd-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <AlertCircle size={16} />
                {error?.response?.data?.detail || 'An unexpected error occurred. Please try again.'}
              </motion.div>
            )}

            {/* New Analysis Button */}
            {(isCompleted || isFailed) && (
              <motion.div
                className="dfd-new-analysis-wrap"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="dfd-new-analysis-btn" onClick={handleReset}>
                    <RefreshCw size={18} />
                    New Scan
                  </button>
                  {result && (
                    <button 
                      className="dfd-new-analysis-btn" 
                      style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                      onClick={() => generateReport('deepfake', { 
                        input_type: file?.type?.split('/')[0], 
                        original_input: result.saved_filename || file?.name,
                        ...result 
                      })}
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

      {/* ── Empty State ── */}
      {showInput && !file && (
        <motion.div className="dfd-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="dfd-empty-icon">
            <ScanEye size={36} />
          </div>
          <h3>Detect Deepfake Media</h3>
          <p>
            Upload any image, video, or audio file and click <strong>Scan for Deepfakes</strong>.
            The engine will analyze it and explain exactly what it found in plain English.
          </p>
          <ul className="dfd-tips">
            <li><ChevronRight size={12} /> Supports JPEG, PNG, WEBP, GIF images</li>
            <li><ChevronRight size={12} /> Supports MP4, MOV video and MP3, WAV, AAC, OGG audio</li>
            <li><ChevronRight size={12} /> Results include a plain-English explanation of what was detected</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default DeepfakeDetectionPage;