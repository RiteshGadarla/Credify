import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startAnalysis, getAnalysisStatus, processUrl, processImage, generateReport } from '../api/factCheck';
import ClaimCard from '../components/ClaimCard';
import AiDetectionBanner from '../components/AiDetectionBanner';
import {
  AlertCircle, CheckCircle2, Loader2, Zap, Brain, Scale,
  FileText, Link2, ImageIcon, UploadCloud, RotateCcw, Shield,
  Search, Radar, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './FactCheckDashboard.css';

const PIPELINE_STEPS = [
  { key: 'parsing', label: 'Parsing Claims', sublabel: 'Extracting verifiable statements', icon: FileText },
  { key: 'researching', label: 'Fetching Sources', sublabel: 'Scanning trusted data sources', icon: Search },
  { key: 'debating', label: 'Evaluating Credibility', sublabel: 'Proponent vs Opponent analysis', icon: Brain },
  { key: 'judging', label: 'Rendering Verdict', sublabel: 'Synthesizing final assessment', icon: Scale },
];

const getPipelineState = (taskData) => {
  if (!taskData) return -1;
  const status = taskData.status || '';

  if (status.startsWith('Completed') || status.startsWith('Failed')) return 4;

  const claims = taskData.claims || [];
  if (claims.length === 0) return 0;

  const hasCompleted = claims.some(c => c.status === 'Completed');
  const allCompleted = claims.every(c => c.status === 'Completed');

  if (allCompleted) return 3;
  if (hasCompleted) return 3;

  const hasEvidence = claims.some(c => c.streaming_sources?.length > 0 || c.key_evidence?.length > 0);
  if (hasEvidence) return 2;

  const hasClaims = claims.length > 0;
  if (hasClaims) return 1;

  return 0;
};

const FactCheckDashboard = () => {
  const queryClient = useQueryClient();
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputImage, setInputImage] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  // phase: 'input' | 'processing' | 'complete'
  const [phase, setPhase] = useState('input');

  const startMutation = useMutation({
    mutationFn: ({ text, sourceType, originalInput }) => startAnalysis(text, sourceType, originalInput),
    onSuccess: (data) => {
      setActiveTaskId(data.task_id);
      setPhase('processing');
    }
  });

  const { data: taskData, isError, error } = useQuery({
    queryKey: ['factCheckStatus', activeTaskId],
    queryFn: () => getAnalysisStatus(activeTaskId),
    enabled: !!activeTaskId,
    refetchInterval: (query) => {
      const data = query.state?.data;
      if (data?.status?.startsWith('Completed') || data?.status?.startsWith('Failed')) {
        return false;
      }
      return 1000;
    }
  });

  const isCompleted = taskData?.status?.startsWith('Completed');
  const isFailed = taskData?.status?.startsWith('Failed');
  const pipelineStep = useMemo(() => getPipelineState(taskData), [taskData]);

  // Detect completion and move to 'complete' phase
  useEffect(() => {
    if (isCompleted || isFailed) {
      setPhase('complete');
    }
  }, [isCompleted, isFailed]);

  const handleAnalyze = async () => {
    setActiveTaskId(null);
    if (inputType === 'text') {
      if (!inputText.trim()) return;
      startMutation.mutate({ text: inputText, sourceType: 'text' });
    } else if (inputType === 'url') {
      if (!inputUrl.trim()) return;
      setIsExtracting(true);
      try {
        const res = await processUrl(inputUrl);
        if (res.text) {
          startMutation.mutate({ text: res.text, sourceType: 'url', originalInput: res.original_input });
        }
      } catch (err) {
        console.error("URL processing failed:", err);
        alert(err.response?.data?.detail || "Failed to extract content from the URL.");
      } finally {
        setIsExtracting(false);
      }
    } else if (inputType === 'image') {
      if (!inputImage) return;
      setIsExtracting(true);
      try {
        const res = await processImage(inputImage);
        if (res.text) {
          startMutation.mutate({ text: res.text, sourceType: 'image', originalInput: res.original_input });
        }
      } catch (err) {
        console.error("Image processing failed:", err);
        alert(err.response?.data?.detail || "Failed to extract text from the image.");
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleNewAnalysis = useCallback(() => {
    setActiveTaskId(null);
    setInputText('');
    setInputUrl('');
    setInputImage(null);
    setPhase('input');
    queryClient.removeQueries({ queryKey: ['factCheckStatus'] });
  }, [queryClient]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (inputType === 'url' && !e.shiftKey))) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const getInputSummary = () => {
    if (inputType === 'text') return inputText.length > 120 ? inputText.substring(0, 120) + '…' : inputText;
    if (inputType === 'url') return inputUrl;
    if (inputType === 'image' && inputImage) return inputImage.name;
    return '';
  };

  const showInput = phase === 'input';
  const showProcess = phase === 'processing' || phase === 'complete';

  return (
    <div className="fc-command-centre">
      {/* Command Centre Header */}
      <motion.div
        className="fc-cc-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="fc-cc-header-left">
          <div className="fc-cc-logo-icon">
            <Shield size={22} />
          </div>
          <div>
            <h1>Claim Verification Engine</h1>
            <p>Real-time fact analysis & credibility assessment</p>
          </div>
        </div>
        {showProcess && (
          <motion.div
            className="fc-cc-status-indicator"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className={`fc-cc-status-dot ${isCompleted ? 'done' : isFailed ? 'failed' : 'active'}`} />
            <span className="fc-cc-status-text">
              {isCompleted ? 'COMPLETE' : isFailed ? 'FAILED' : 'ANALYZING'}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ============ INPUT PHASE ============ */}
      <AnimatePresence mode="wait">
        {showInput && (
          <motion.div
            key="input-phase"
            className="fc-input-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="fc-tabs">
              <button
                className={`fc-tab-btn ${inputType === 'text' ? 'active' : ''}`}
                onClick={() => setInputType('text')}
              >
                <FileText size={16} /> Text
              </button>
              <button
                className={`fc-tab-btn ${inputType === 'url' ? 'active' : ''}`}
                onClick={() => setInputType('url')}
              >
                <Link2 size={16} /> URL
              </button>
              <button
                className={`fc-tab-btn ${inputType === 'image' ? 'active' : ''}`}
                onClick={() => setInputType('image')}
              >
                <ImageIcon size={16} /> Image
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={inputType}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {inputType === 'text' && (
                  <textarea
                    className="fc-textarea"
                    placeholder={"Enter a claim, article excerpt, or statement to verify...\n\nExample: \"The Great Wall of China is visible from space with the naked eye.\""}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={5}
                  />
                )}

                {inputType === 'url' && (
                  <div className="fc-url-wrapper">
                    <Link2 size={18} style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      type="url"
                      className="fc-url-input"
                      placeholder="Paste article or web page URL here (e.g. https://example.com)"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}

                {inputType === 'image' && (
                  <div className={`fc-image-dropzone ${inputImage ? 'has-file' : ''}`}>
                    <input
                      type="file"
                      id="file-upload"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => setInputImage(e.target.files[0])}
                    />
                    <label htmlFor="file-upload" style={{ width: '100%', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="fc-image-dropzone-icon">
                        <UploadCloud size={24} />
                      </div>
                      <div className="fc-image-text">
                        {inputImage ? inputImage.name : "Click to upload or drag an image here"}
                      </div>
                      <div className="fc-image-subtext">
                        {inputImage ? "Click to change file" : "Extracts text for fact-checking via OCR"}
                      </div>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="fc-input-footer">
              <span className="fc-char-count">
                {inputType === 'text' ? `${inputText.length} characters` : ''}
                {inputType === 'text' ? ' · Press ⌘+Enter to analyze' : ''}
                {inputType === 'url' ? 'Press Enter to analyze URL' : ''}
              </span>
              <button
                className="fc-analyze-btn"
                onClick={handleAnalyze}
                disabled={startMutation.isPending || isExtracting || (inputType === 'text' && !inputText.trim()) || (inputType === 'url' && !inputUrl.trim()) || (inputType === 'image' && !inputImage)}
              >
                {isExtracting ? (
                  <><Loader2 size={16} className="animate-spin" /> Extracting...</>
                ) : startMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Initiating...</>
                ) : (
                  <><Zap size={16} /> Analyze Claims</>
                )}
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
              className="fc-input-summary"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.1 }}
            >
              <div className="fc-input-summary-inner">
                <div className="fc-input-summary-badge">
                  {inputType === 'text' && <FileText size={14} />}
                  {inputType === 'url' && <Link2 size={14} />}
                  {inputType === 'image' && <ImageIcon size={14} />}
                  <span>{inputType.toUpperCase()}</span>
                </div>
                <span className="fc-input-summary-text">{getInputSummary()}</span>
              </div>
            </motion.div>

            {/* Pipeline Command Centre Grid */}
            {!isCompleted && !isFailed && (
              <motion.div
                className="fc-pipeline-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="fc-pipeline-grid-header">
                  <div className="fc-pipeline-title-row">
                    <Radar size={18} className="fc-radar-icon" />
                    <h3>Analysis Pipeline</h3>
                  </div>
                  <div className="fc-pipeline-progress-container">
                    <div className="fc-pipeline-progress-bar">
                      <motion.div
                        className="fc-pipeline-progress-fill"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min((pipelineStep / 4) * 100, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="fc-pipeline-progress-text">{Math.round(Math.min((pipelineStep / 4) * 100, 100))}%</span>
                  </div>
                </div>

                <div className="fc-pipeline-steps-grid">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    let state = 'waiting';
                    if (idx < pipelineStep) state = 'completed';
                    else if (idx === pipelineStep) state = 'active';

                    return (
                      <motion.div
                        key={step.key}
                        className={`fc-pipeline-step-card ${state}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + idx * 0.1 }}
                      >
                        <div className={`fc-step-icon-wrap ${state}`}>
                          {state === 'completed' ? (
                            <CheckCircle2 size={20} />
                          ) : state === 'active' ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Icon size={20} />
                          )}
                        </div>
                        <div className="fc-step-info">
                          <div className={`fc-step-label ${state}`}>{step.label}</div>
                          <div className="fc-step-sublabel">{step.sublabel}</div>
                        </div>
                        {state === 'active' && (
                          <div className="fc-step-pulse-ring" />
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
                className={`fc-completion-banner ${isFailed ? 'failed' : 'success'}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="fc-completion-icon">
                  {isCompleted ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                <div className="fc-completion-info">
                  <h3>{isCompleted ? 'Analysis Complete' : 'Analysis Failed'}</h3>
                  <p>{isCompleted ? `${taskData?.claims?.length || 0} claim(s) verified` : 'An error occurred during analysis.'}</p>
                </div>
                <span className={`badge ${isCompleted ? 'badge-success' : 'badge-danger'}`}>
                  {taskData?.status}
                </span>
              </motion.div>
            )}

            {/* Error */}
            <AnimatePresence>
              {isError && (
                <motion.div
                  className="fc-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={16} />
                  {error?.message || 'An error occurred during analysis.'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Detection Banner */}
            {taskData?.ai_detection && (
              <AiDetectionBanner detection={taskData.ai_detection} />
            )}

            {/* Results */}
            {taskData?.claims && taskData.claims.length > 0 && (
              <motion.div
                className="fc-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {taskData.claims.map((claim, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.06 }}
                  >
                    <ClaimCard claimData={claim} index={idx} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* New Analysis Button */}
            {(isCompleted || isFailed) && (
              <motion.div
                className="fc-new-analysis-wrap"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="fc-new-analysis-btn" onClick={handleNewAnalysis}>
                    <RotateCcw size={18} />
                    New Analysis
                  </button>
                  {taskData && (
                    <button 
                      className="fc-new-analysis-btn" 
                      style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                      onClick={() => generateReport('fact_check', { 
                        input_type: inputType, 
                        original_input: inputUrl || (inputImage ? inputImage.name : inputText), 
                        text: inputText, 
                        ...taskData 
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
    </div>
  );
};

export default FactCheckDashboard;
