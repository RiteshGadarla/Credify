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

export const deleteHistoryItem = async (itemId) => {
    const response = await api.delete(`/api/history/${itemId}`);
    return response.data;
};

export const deleteAllHistory = async () => {
    const response = await api.delete('/api/history/');
    return response.data;
};


export const scanTextForAi = async (text) => {
    const response = await api.post('/api/ai-detection/scan', { text });
    return response.data; // DetectionResult
};

export const generateReport = async (reportType, data) => {
    const response = await api.post('/api/report/generate', { report_type: reportType, data }, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from Content-Disposition if present
    let filename = `credify_report.pdf`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export const scanMediaForDeepfake = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/deepfake-detection/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // DeepfakeDetectionResult
};
