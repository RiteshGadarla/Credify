import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startAnalysis, getAnalysisStatus } from '../api/factCheck';
import ClaimCard from '../components/ClaimCard';
import { Search, AlertCircle, CheckCircle2, Loader2, Zap, Brain, Scale, FileText } from 'lucide-react';
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
  const [inputText, setInputText] = useState('');
  const [activeTaskId, setActiveTaskId] = useState(null);

  const startMutation = useMutation({
    mutationFn: startAnalysis,
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

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setActiveTaskId(null);
    startMutation.mutate(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
        <textarea
          className="fc-textarea"
          placeholder="Enter a claim, article excerpt, or statement to verify...&#10;&#10;Example: &quot;The Great Wall of China is visible from space with the naked eye.&quot;"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={5}
        />
        <div className="fc-input-footer">
          <span className="fc-char-count">{inputText.length} characters · Press ⌘+Enter to analyze</span>
          <button
            className="fc-analyze-btn"
            onClick={handleAnalyze}
            disabled={startMutation.isPending || !inputText.trim() || isProcessing}
          >
            {startMutation.isPending ? (
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
