import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startAnalysis, getAnalysisStatus, processUrl, processImage } from '../api/factCheck';
import ClaimCard from '../components/ClaimCard';
import AiDetectionBanner from '../components/AiDetectionBanner';
import { Search, AlertCircle, CheckCircle2, Loader2, Zap, Brain, Scale, FileText, Link2, ImageIcon, UploadCloud } from 'lucide-react';
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
  const [inputType, setInputType] = useState('text'); // "text", "url", "image"
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputImage, setInputImage] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const startMutation = useMutation({
    mutationFn: ({text, sourceType, originalInput}) => startAnalysis(text, sourceType, originalInput),
    onSuccess: (data) => {
      setActiveTaskId(data.task_id);
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

  const isProcessing = activeTaskId && !taskData?.status?.startsWith('Completed') && !taskData?.status?.startsWith('Failed');
  const isCompleted = taskData?.status?.startsWith('Completed');
  const isFailed = taskData?.status?.startsWith('Failed');
  const pipelineStep = useMemo(() => getPipelineState(taskData), [taskData]);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (inputType === 'url' && !e.shiftKey))) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="fact-check-page">
      {/* Header */}
      <motion.div
        className="fc-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1>Claim Verification Engine</h1>
        <p>Paste any article, statement, or paragraph — we'll analyze each claim for factual accuracy.</p>
      </motion.div>

      {/* Input Section */}
      <motion.div
        className="fc-input-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
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
                placeholder="Enter a claim, article excerpt, or statement to verify...&#10;&#10;Example: &quot;The Great Wall of China is visible from space with the naked eye.&quot;"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={5}
              />
            )}
            
            {inputType === 'url' && (
              <div className="fc-url-wrapper">
                <Link2 size={18} className="text-tertiary" style={{ color: 'var(--text-tertiary)' }} />
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
            disabled={startMutation.isPending || isExtracting || isProcessing || (inputType === 'text' && !inputText.trim()) || (inputType === 'url' && !inputUrl.trim()) || (inputType === 'image' && !inputImage)}
          >
            {isExtracting ? (
              <><Loader2 size={16} className="animate-spin" /> Extracting...</>
            ) : startMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Starting...</>
            ) : isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Zap size={16} /> Analyze Claims</>
            )}
          </button>
        </div>
      </motion.div>

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

      {/* Processing Pipeline */}
      <AnimatePresence>
        {taskData && (
          <motion.div
            className="fc-pipeline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="pipeline-status-card">
              <div className="pipeline-header">
                {isCompleted ? (
                  <CheckCircle2 size={20} className="pipeline-done-icon" />
                ) : isFailed ? (
                  <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
                ) : (
                  <div className="pipeline-spinner"></div>
                )}
                <h3>
                  {isCompleted ? 'Analysis Complete' : isFailed ? 'Analysis Failed' : 'Analyzing Claims...'}
                </h3>
                <span className={`badge ${isCompleted ? 'badge-success' : isFailed ? 'badge-danger' : 'badge-primary'}`}>
                  {taskData.status}
                </span>
              </div>

              {!isCompleted && !isFailed && (
                <div className="pipeline-steps">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    let state = 'waiting';
                    if (idx < pipelineStep) state = 'completed';
                    else if (idx === pipelineStep) state = 'active';

                    return (
                      <motion.div
                        key={step.key}
                        className={`pipeline-step ${state}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        <div className={`step-dot ${state}`}>
                          {state === 'completed' ? (
                            <CheckCircle2 size={14} />
                          ) : state === 'active' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Icon size={12} />
                          )}
                        </div>
                        <div className="step-content">
                          <div className={`step-label ${state}`}>{step.label}</div>
                          <div className="step-sublabel">{step.sublabel}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Detection Banner — shown once detection data is available */}
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
    </div>
  );
};

export default FactCheckDashboard;
