import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startAnalysis, getAnalysisStatus } from '../api/factCheck';
import ClaimCard from '../components/ClaimCard';
import './FactCheckDashboard.css';

const FactCheckDashboard = () => {
    const [inputText, setInputText] = useState('');
    const [activeTaskId, setActiveTaskId] = useState(null);

    const startMutation = useMutation({
        mutationFn: startAnalysis,
        onSuccess: (data) => {
            setActiveTaskId(data.task_id);
        }
    });

    const { data: taskData, isError, error, refetch } = useQuery({
        queryKey: ['factCheckStatus', activeTaskId],
        queryFn: () => getAnalysisStatus(activeTaskId),
        enabled: !!activeTaskId,
        refetchInterval: (data) => {
            if (!data) return 1000;
            // Stop polling if completed or failed
            if (data?.status?.startsWith('Completed') || data?.status?.startsWith('Failed')) {
                return false;
            }
            return 1000;
        }
    });

    const handleAnalyze = () => {
        if (!inputText.trim()) return;
        startMutation.mutate(inputText);
    };

    return (
        <div className="fact-check-dashboard">
            <h1>Fact-Checking & Claim Verification Engine</h1>
            
            <div className="input-section">
                <textarea 
                    placeholder="Enter an article or paragraph to verify..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={6}
                />
                <button 
                    onClick={handleAnalyze} 
                    disabled={startMutation.isPending || (activeTaskId && !taskData?.status?.startsWith('Completed') && !taskData?.status?.startsWith('Failed'))}
                >
                    {startMutation.isPending ? 'Starting...' : 'Analyze Text'}
                </button>
            </div>

            {isError && <div className="error-message">Error: {error.message}</div>}

            {taskData && (
                <div className="results-section">
                    <div className="status-banner">
                        <div className="spinner"></div> 
                        <h3>Overall Status: {taskData.status}</h3>
                    </div>
                    
                    <div className="claims-list">
                        {taskData.claims && taskData.claims.map((claim, idx) => (
                            <ClaimCard key={idx} claimData={claim} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FactCheckDashboard;
