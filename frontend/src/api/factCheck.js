import api from './axios';

export const extractClaims = async (text) => {
    const response = await api.post('/api/fact-check/extract-claims', { text });
    return response.data;
};

export const startAnalysis = async (text, sourceType = 'text', originalInput = null) => {
    const payload = { text, source_type: sourceType };
    if (originalInput) {
        payload.original_input = originalInput;
    }
    const response = await api.post('/api/fact-check/analyze', payload);
    return response.data; // { task_id }
};

export const processUrl = async (url) => {
    const response = await api.post('/api/process/process-url', { url });
    return response.data;
};

export const processImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/process/process-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const getAnalysisStatus = async (taskId) => {
    const response = await api.get(`/api/fact-check/analyze/${taskId}`);
    return response.data; // { task_id, status, claims: [...] }
};

export const getHistory = async () => {
    const response = await api.get('/api/history/');
    return response.data; // { metrics, history }
};

export const scanTextForAi = async (text) => {
    const response = await api.post('/api/ai-detection/scan', { text });
    return response.data; // DetectionResult
};
