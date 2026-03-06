const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const Pipeline = require('../models/Pipeline');

const router = express.Router();
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5001';

// POST /api/execute – Execute pipeline via Python ML engine
router.post('/', auth, async (req, res) => {
    try {
        const { nodes, edges, uploaded_files, pipelineId } = req.body;

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            return res.status(400).json({ error: 'Pipeline must have at least one node.' });
        }

        // Free tier limits
        if (nodes.length > 10) {
            return res.status(400).json({
                error: `Free plan allows max 10 nodes. You have ${nodes.length}.`
            });
        }

        const startTime = Date.now();

        // Forward to Python ML engine
        const response = await axios.post(`${ML_ENGINE_URL}/execute-pipeline`, {
            nodes,
            edges,
            uploaded_files
        }, {
            timeout: 35000  // 35s (buffer over the 30s execution timeout)
        });

        const executionTime = Date.now() - startTime;
        const results = response.data;

        // If pipelineId is provided, save the run to history (latest only for now as requested)
        if (pipelineId) {
            try {
                const runData = {
                    runId: results.run_id || `run_${Date.now()}`,
                    executedAt: new Date(),
                    metrics: results.results || {},
                    logs: results.logs || [],
                    nodeStates: nodes, // current nodes snapshot
                    executionTime: executionTime,
                    status: results.success ? 'completed' : 'failed'
                };

                // Keep only the latest run for now, but in an array as requested
                await Pipeline.findByIdAndUpdate(pipelineId, {
                    $set: { 
                        runs: [runData],
                        status: results.success ? 'completed' : 'failed'
                    }
                });
            } catch (dbErr) {
                console.error('Error saving run to database:', dbErr.message);
                // Don't fail the request if DB save fails
            }
        }

        res.json(results);
    } catch (err) {
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        console.error('Execution error:', err.message);
        res.status(500).json({
            error: 'Failed to execute pipeline. Is the ML engine running?',
            details: err.message
        });
    }
});

// GET /api/execute/download-model/:id – Proxy model download
router.get('/download-model/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios({
            method: 'get',
            url: `${ML_ENGINE_URL}/download-model/${id}`,
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=model_${id}.pkl`);
        response.data.pipe(res);
    } catch (err) {
        console.error('Download error:', err.message);
        res.status(404).json({ error: 'Model file not found or ML engine unreachable' });
    }
});

module.exports = router;
