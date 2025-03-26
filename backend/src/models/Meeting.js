const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    audioFile: {
        filename: String,
        originalname: String,
        path: String,
        status: {
            type: String,
            enum: ['uploading', 'completed', 'error'],
            default: 'uploading'
        },
        error: String
    },
    transcript: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'error'],
            default: 'pending'
        },
        content: mongoose.Schema.Types.Mixed,
        error: String
    },
    summary: {
        status: {
            type: String,
            enum: ['not_started', 'pending', 'processing', 'completed', 'error'],
            default: 'not_started'
        },
        ko: String,
        en: String,
        zh: String,
        error: String
    },
    speakerNames: {
        type: Object,
        default: {}
    },
    summaryStrategy: {
        type: String,
        enum: ['content', 'speaker'],
        default: 'content'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Meeting', meetingSchema); 