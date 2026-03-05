const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const UsageLog = require('../models/UsageLog');

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EXPLAIN_SYSTEM_PROMPT = `You are an expert ML instructor.

Return ONLY valid JSON.

Do NOT include markdown.
Do NOT include explanations outside JSON.

Output schema:

{
"summary": string,
"steps": [
{
"name": string,
"purpose": string,
"why_needed": string
}
],
"best_practices": string[],
"warnings": string[]
}

Keep explanation concise and educational.`;

const QA_SYSTEM_PROMPT = `You are an ML tutor answering a question about a specific pipeline.

Be concise.
Maximum 5-6 sentences.
Do not hallucinate new pipeline steps.
Base answer ONLY on provided context.

Return plain text only.`;

// Helper: convert graph to compact text
function summarizeGraph(nodes, edges) {
    if (!nodes || nodes.length === 0) return "Empty pipeline";
    const nameMap = {};
    nodes.forEach(n => nameMap[n.id] = n.data?.label || n.data?.nodeType || n.id);
    if (!edges || edges.length === 0) return nodes.map(n => nameMap[n.id]).join(', ');

    return edges.map(e => `${nameMap[e.source]} \u2192 ${nameMap[e.target]}`).join(' | ');
}

// MongoDB-backed rate limiting / quota for free tier
async function checkDailyQuota(userId, endpoint) {
    const today = new Date().toISOString().split('T')[0];
    
    // Limits: 20 explains per day, 50 QA calls per day
    const limit = endpoint === 'explain' ? 20 : 50;

    const log = await UsageLog.findOneAndUpdate(
        { userId, date: today, endpoint },
        { $setOnInsert: { userId, date: today, endpoint }, $inc: { count: 0 } },
        { upsert: true, new: true }
    );

    if (log.count >= limit) {
        return false;
    }

    await UsageLog.updateOne(
        { userId, date: today, endpoint },
        { $inc: { count: 1 } }
    );
    
    return true;
}

// Route 1: Generate Structured Explanation
router.post('/explain-pipeline', auth, async (req, res) => {
    try {
        const { nodes, edges } = req.body;

        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Nodes array is required.' });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Server config error: Gemini API key missing.' });
        }

        // Daily limit check
        const hasQuota = await checkDailyQuota(req.user.userId, 'explain');
        if (!hasQuota) {
            return res.status(429).json({ error: 'Daily explanation quota exceeded.' });
        }

        const compactPipeline = summarizeGraph(nodes, edges);
        const prompt = `Explain this ML pipeline:\n\n${compactPipeline}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            system_instruction: {
                parts: [{ text: EXPLAIN_SYSTEM_PROMPT }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2
            }
        };

        const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) throw new Error('Invalid response from Gemini');

        let parsedJson;
        try {
            const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedJson = JSON.parse(cleanText);
        } catch (err) {
            // Fallback for extreme cases where JSON parsing fails
            parsedJson = {
                summary: "This pipeline processes datasets through various stages.",
                steps: nodes.map(n => ({
                    name: n.data?.label || 'Step',
                    purpose: "Processes data.",
                    why_needed: "Required for the workflow."
                })),
                best_practices: ["Ensure clean data inputs."],
                warnings: ["Results depend on data quality."]
            };
        }

        // Validate minimal schema
        if (!parsedJson.summary || !Array.isArray(parsedJson.steps)) {
            parsedJson.summary = "A sequence of ML operations.";
            parsedJson.steps = parsedJson.steps || [];
            parsedJson.best_practices = parsedJson.best_practices || [];
            parsedJson.warnings = parsedJson.warnings || [];
        }

        res.json({
            explanation: parsedJson,
            compactPipeline
        });
    } catch (err) {
        console.error('Explanation Error:', err.message);
        res.status(500).json({ error: 'Failed to generate pipeline explanation.' });
    }
});

// Route 2: Stateless Q&A
router.post('/pipeline-question', auth, async (req, res) => {
    try {
        const { question, explanationContext, compactPipeline } = req.body;

        if (!question || !compactPipeline) {
            return res.status(400).json({ error: 'Question and pipeline context required.' });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Server config error: Gemini API key missing.' });
        }

        // Daily limit check
        const hasQuota = await checkDailyQuota(req.user.userId, 'qa');
        if (!hasQuota) {
            return res.status(429).json({ error: 'Daily Q&A quota exceeded.' });
        }

        const contextStr = explanationContext ? JSON.stringify(explanationContext) : 'None';
        const prompt = `Pipeline layout: ${compactPipeline}\nDetailed Context: ${contextStr}\n\nStudent Question: ${question}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            system_instruction: {
                parts: [{ text: QA_SYSTEM_PROMPT }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 300
            }
        };

        const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Invalid response from Gemini');

        res.json({ answer: text.trim().replace(/```/g, '') });
    } catch (err) {
        console.error('QA Error:', err.message);
        res.status(500).json({ error: 'Failed to answer question.' });
    }
});

module.exports = router;
