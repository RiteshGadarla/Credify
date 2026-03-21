import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const extractClaims = async (text) => {
    const response = await api.post('/fact-check/extract-claims', { text });
    return response.data;
};

export const startAnalysis = async (text) => {
    const response = await api.post('/fact-check/analyze', { text });
    return response.data; // { task_id }
};

export const getAnalysisStatus = async (taskId) => {
    const response = await api.get(`/fact-check/analyze/${taskId}`);
    return response.data; // { task_id, status, claims: [...] }
};
