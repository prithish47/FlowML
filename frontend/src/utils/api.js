import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Add JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('flowml_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    signup: (name, email, password) => api.post('/auth/signup', { name, email, password }),
    getMe: () => api.get('/auth/me')
};

// Pipeline API
export const pipelineAPI = {
    list: () => api.get('/pipelines'),
    get: (id) => api.get(`/pipelines/${id}`),
    create: (data) => api.post('/pipelines', data),
    update: (id, data) => api.put(`/pipelines/${id}`, data),
    delete: (id) => api.delete(`/pipelines/${id}`)
};

// Execute API
export const executeAPI = {
    baseURL: API_BASE,
    run: (nodes, edges, uploaded_files, pipelineId = null) =>
        api.post('/execute', { nodes, edges, uploaded_files, pipelineId })
};

// Upload API
export const uploadAPI = {
    uploadCSV: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

// Generate AI API
export const generateAPI = {
    generatePipeline: (prompt) => api.post('/generate-pipeline', { prompt })
};

// Explain API
export const explainAPI = {
    explainPipeline: (nodes, edges) => api.post('/explain-pipeline', { nodes, edges }),
    askQuestion: (question, explanationContext, compactPipeline) =>
        api.post('/pipeline-question', { question, explanationContext, compactPipeline })
};

export default api;
