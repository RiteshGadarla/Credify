import React, { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { scanMediaForDeepfake } from '../api/factCheck';
import {
  ScanEye, ShieldCheck, ShieldAlert, Info, Loader2,
  UploadCloud, RefreshCw, Film, Image, Music, ChevronRight,
  Zap, AlertTriangle, FileQuestion,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './DeepfakeDetectionPage.css';

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

/* ── Derive confidence from how far score is from the 50 midpoint ── */
const getConfidence = (score, status) => {
  const distance = Math.abs(score - 50);
  if (distance >= 35) return { level: 'High', color: status === 'AUTHENTIC' ? 'var(--success)' : 'var(--danger)' };
  if (distance >= 18) return { level: 'Moderate', color: 'var(--warning)' };
  return { level: 'Low', color: 'var(--text-tertiary)' };
};

/* ── Plain-English interpretation based on status + score ──────── */
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

/* ── Scanning Steps ───────────────────────────────────────────── */
const STEPS = ['Uploading media…', 'Analyzing for deepfakes…', 'Processing results…'];

const ScanningSteps = () => {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dfd-steps">
      {STEPS.map((s, i) => (
        <div key={i} className={`dfd-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
          {i < step ? <ShieldCheck size={14} /> : i === step ? <Loader2 size={14} className="spin" /> : <span className="dfd-step-dot" />}
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────── */
const DeepfakeDetectionPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const { mutate, isPending, data: result, reset, error } = useMutation({
    mutationFn: () => scanMediaForDeepfake(file),
  });

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    reset();
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }, [reset]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleReset = () => { setFile(null); setPreview(null); reset(); };

  const band = result && !result.skipped ? getBand(result.status) : null;
  const config = band ? BAND_CONFIG[band] : null;
  const BandIcon = config?.icon;

  return (
    <div className="dfd-page">
      {/* ── Header ── */}
      <motion.div className="aid-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="aid-header-icon" style={{
          background: 'linear-gradient(135deg, rgba(103,58,183,0.12), rgba(156,39,176,0.10))',
          border: '1.5px solid rgba(103,58,183,0.2)',
          color: 'var(--primary-deeper)',
        }}>
          <ScanEye size={22} />
        </div>
        <div>
          <h1>Deepfake Media Detection</h1>
          <p>Detect AI-generated or manipulated images, video, and audio</p>
        </div>
      </motion.div>

      {/* ── Upload Card ── */}
      <motion.div
        className={`dfd-upload-card ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
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
            <p className="dfd-drop-title">Drop a file or <span className="dfd-link">click to browse</span></p>
            <p className="dfd-drop-sub">Images · Video (MP4/MOV) · Audio (MP3/WAV/AAC/OGG) &mdash; up to 250 MB</p>
          </div>
        )}
      </motion.div>

      {/* ── Actions ── */}
      {file && (
        <motion.div className="dfd-actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <button className="aid-reset-btn" onClick={handleReset}>
            <RefreshCw size={14} /> Change file
          </button>
          <button className="aid-scan-btn"
            onClick={() => { if (!file || isPending) return; mutate(); }}
            disabled={isPending}
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 100%)' }}>
            {isPending ? <><Loader2 size={15} className="spin" /> Scanning…</> : <><Zap size={15} /> Scan for Deepfakes</>}
          </button>
        </motion.div>
      )}

      {/* ── Scanning progress ── */}
      <AnimatePresence>
        {isPending && (
          <motion.div className="dfd-scanning-card" initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ScanningSteps />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ── */}
      {error && (
        <motion.div className="aid-result-card band-ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="aid-result-header">
            <div className="aid-result-icon-wrap" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="aid-result-title" style={{ color: 'var(--danger)' }}>Scan Failed</p>
              <p className="aid-result-desc">
                {error?.response?.data?.detail || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && !isPending && (
          <motion.div className="aid-results"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }} transition={{ duration: 0.35 }}>

            {result.skipped ? (
              <div className="aid-result-card band-mixed">
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
            ) : (() => {

              const displayScore = result.final_score;
              const confidence = getConfidence(displayScore, result.status);
              const interpretation = getInterpretation(result.status, displayScore, result.media_type);
              const MediaIcon = MEDIA_TYPE_ICON[result.media_type] || FileQuestion;

              return (
                <div className={`aid-result-card ${config.cls}`}>

                  {/* ── Verdict header ── */}
                  <div className="aid-result-header">
                    <div className="aid-result-icon-wrap" style={{ background: config.accentLight, color: config.accent }}>
                      <BandIcon size={20} />
                    </div>
                    <div className="aid-result-title-block">
                      <p className="aid-result-title" style={{ color: config.accent }}>{config.label}</p>
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

                  {/* ── Plain-English interpretation ── */}
                  <div className="dfd-interpretation">
                    <p>{interpretation}</p>
                  </div>

                  {/* ── Score breakdown bar ── */}
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
                    <p className="aid-bar-footnote" style={{ marginTop: '0.4rem' }}>
                      Below 30 → likely synthetic · 30–68 → uncertain · above 68 → likely authentic
                    </p>
                  </div>

                  {/* ── Caution note for suspicious / fake ── */}
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
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!file && !result && !isPending && (
        <motion.div className="aid-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="aid-empty-icon" style={{
            background: 'linear-gradient(135deg, rgba(103,58,183,0.08), rgba(156,39,176,0.06))',
            border: '1.5px solid rgba(103,58,183,0.15)',
            color: 'var(--primary-deeper)',
          }}>
            <ScanEye size={36} />
          </div>
          <h3>Detect Deepfake Media</h3>
          <p>
            Upload any image, video, or audio file and click <strong>Scan for Deepfakes</strong>.
            The engine will analyze it and explain exactly what it found in plain English.
          </p>
          <ul className="aid-tips">
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