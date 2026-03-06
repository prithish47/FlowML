const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Pipeline'
    },
    description: {
        type: String,
        default: ''
    },
    nodes: {
        type: Array,
        default: []
    },
    edges: {
        type: Array,
        default: []
    },
    runs: [{
        runId: String,
        executedAt: { type: Date, default: Date.now },
        metrics: { type: Object, default: {} },
        logs: { type: Array, default: [] },
        nodeStates: { type: Array, default: [] }, // snapshot of nodes at run time
        executionTime: Number, // in ms
        status: {
            type: String,
            enum: ['completed', 'failed'],
            default: 'completed'
        }
    }],
    status: {
        type: String,
        enum: ['draft', 'running', 'completed', 'failed'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

pipelineSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Pipeline', pipelineSchema);
