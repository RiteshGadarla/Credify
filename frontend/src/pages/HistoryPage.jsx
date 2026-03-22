import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHistory, generateReport } from '../api/factCheck';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Clock, X, AlertCircle, Link2, ImageIcon, FileText, Download, ScanEye } from 'lucide-react';
import './HistoryPage.css';
import ClaimCard from '../components/ClaimCard';
import AiDetectionBanner from '../components/AiDetectionBanner';

const HistoryPage = () => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistory
  });

  const [selectedItem, setSelectedItem] = useState(null);

  const historyList = historyData?.history || [];

  const handleClose = () => setSelectedItem(null);

  const getIstDate = (ts) => {
    let dateStr = ts;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr += 'Z';
    }
    return new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const renderItemPreview = (item, idx) => {
    const isFactCheck = item.type === 'fact_check';
    const isDeepfake = item.type === 'deepfake';
    const icon = isFactCheck ? <Search size={18} /> : isDeepfake ? <ScanEye size={18} /> : <Sparkles size={18} />;
    const typeLabel = isFactCheck ? 'Fact Verification' : isDeepfake ? 'Deepfake Analysis' : 'AI Detection';
    
    let previewText = item.input_data || '';
    if (item.input_type === 'image' && item.extracted_text) {
      previewText = item.extracted_text;
    }
    
    const inputSnippet = previewText.substring(0, 150) + (previewText.length > 150 ? '...' : '');
    
    let resultText = '';
    let statusClass = 'neutral';
    
    if (isFactCheck) {
      if (item.status?.startsWith('Failed')) {
        resultText = 'Failed';
        statusClass = 'danger';
      } else {
        const claimsCount = (item.claims || []).length;
        resultText = `${claimsCount} claim${claimsCount !== 1 ? 's' : ''} verified`;
        statusClass = claimsCount > 0 ? 'success' : 'warning';
      }
    } else if (item.ai_result) {
      const score = item.ai_result.human_score || 0;
      resultText = `${score.toFixed(0)}% Human`;
      statusClass = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger';
    } else if (item.type === 'deepfake' && item.deepfake_result) {
      const status = item.deepfake_result.status;
      resultText = status;
      statusClass = status === 'AUTHENTIC' ? 'success' : status === 'FAKE' ? 'danger' : 'warning';
    }

    const inputIcon = item.input_type === 'image' ? <ImageIcon size={14} /> : 
                      item.input_type === 'url' ? <Link2 size={14} /> : 
                      <FileText size={14} />;

    return (
      <motion.div
        key={item._id}
        className="hp-list-item"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        onClick={() => setSelectedItem(item)}
      >
        <div className="hp-item-icon-col">
          <div className="hp-item-icon">{icon}</div>
        </div>
        <div className="hp-item-main-col">
          <div className="hp-item-header">
            <span className="hp-item-type">{typeLabel}</span>
            <div className="hp-item-meta">
              <span className="hp-input-type" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {inputIcon} {item.input_type}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {getIstDate(item.timestamp)}
              </span>
            </div>
          </div>
          <div className="hp-item-snippet">{inputSnippet || 'No input provided'}</div>
        </div>
        <div className="hp-item-status-col">
          <span className={`hp-badge hp-badge-${statusClass}`}>
            {resultText}
          </span>
        </div>
      </motion.div>
    );
  };

  const renderDetails = () => {
    if (!selectedItem) return null;
    const isFactCheck = selectedItem.type === 'fact_check';
    const isDeepfake = selectedItem.type === 'deepfake';

    return (
      <motion.div 
        className="hp-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div 
          className="hp-modal-content"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hp-modal-header">
            <h3>{isFactCheck ? 'Fact Verification Details' : isDeepfake ? 'Deepfake Analysis Details' : 'AI Detection Details'}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="fc-analyze-btn" 
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}
                onClick={() => generateReport(selectedItem.type, selectedItem)}
              >
                <Download size={14} /> Generate Report
              </button>
              <button className="hp-modal-close" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="hp-modal-body">
            {/* Input Section */}
            <div className="hp-detail-section">
              <h4>Input Data ({selectedItem.input_type || 'text'})</h4>
              
              {selectedItem.input_type === 'image' ? (
                <div className="hp-image-preview">
                  <img src={`${api.defaults.baseURL}/api/uploads/${selectedItem.input_data}`} alt="Uploaded Input" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain' }} />
                  {selectedItem.extracted_text && (
                    <div className="hp-text-box mt-3">
                      <strong>Extracted OCR Text:</strong>
                      <p>{selectedItem.extracted_text}</p>
                    </div>
                  )}
                </div>
              ) : selectedItem.input_type === 'url' ? (
                <div className="hp-url-preview">
                  <a href={selectedItem.input_data} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }} >
                    <Link2 size={16} /> {selectedItem.input_data}
                  </a>
                  {selectedItem.extracted_text && (
                    <div className="hp-text-box">
                      <strong>Extracted Content:</strong>
                      <p>{selectedItem.extracted_text}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hp-text-box">
                  <p>{selectedItem.input_data}</p>
                </div>
              )}
            </div>

            {/* AI Detection Result */}
            {selectedItem.type === 'ai_detection' && selectedItem.ai_result && (
              <div className="hp-detail-section">
                <h4>AI Scanning Results</h4>
                <div style={{ marginTop: '1rem' }}>
                    <AiDetectionBanner detection={selectedItem.ai_result} />
                </div>
              </div>
            )}

            {/* Deepfake Result */}
            {selectedItem.type === 'deepfake' && selectedItem.deepfake_result && (
              <div className="hp-detail-section">
                <h4>Analysis Results</h4>
                <div className="hp-text-box mt-3">
                  <p><strong>Status:</strong> {selectedItem.deepfake_result.status}</p>
                  <p><strong>Score:</strong> {selectedItem.deepfake_result.final_score?.toFixed(1)} / 100</p>
                  <p><strong>Media Type:</strong> {selectedItem.deepfake_result.media_type}</p>
                </div>
              </div>
            )}

            {/* Fact Check Result */}
            {isFactCheck && (
              <div className="hp-detail-section">
                <h4>Verified Claims</h4>
                {selectedItem.status?.startsWith('Failed') ? (
                  <div className="hp-error-box">
                    <AlertCircle size={18} />
                    <span>Analysis failed: {selectedItem.status}</span>
                  </div>
                ) : (
                  <div className="hp-claims-list">
                    {(selectedItem.claims || []).length === 0 ? (
                      <p className="hp-empty-text">No verifiable claims were found in this input.</p>
                    ) : (
                        <div>
                        {(selectedItem.claims || []).map((claim, idx) => (
                           <ClaimCard key={idx} claimData={claim} index={idx} />
                        ))}
                        </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="history-page">
      <div className="hp-content-area">
        <header className="hp-header">
          <h1>Verification History</h1>
          <p>Review your past fact-checking and AI detection analyses.</p>
        </header>

        {isLoading ? (
          <div className="flex-center" style={{ height: '50vh' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : historyList.length === 0 ? (
          <div className="hp-empty-state">
            <Search size={48} className="hp-empty-icon" />
            <h3>No history found</h3>
            <p>You haven't run any analysis yet. Head over to Fact Check or AI Detection to get started.</p>
          </div>
        ) : (
          <div className="hp-list">
            {historyList.map((item, idx) => renderItemPreview(item, idx))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {renderDetails()}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPage;
