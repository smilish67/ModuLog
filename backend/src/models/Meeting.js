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
    status: {
        type: String,
        enum: ['processing', 'completed', 'error'],
        default: 'processing'
    },
    transcript: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'error'],
            default: 'pending'
        },
        content: String,
        error: String
    },
    summary: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'error'],
            default: 'pending'
        },
        ko: String,
        en: String,
        zh: String,
        error: String
    },
    summaryStrategy: {
        type: String,
        enum: ['content', 'speaker'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Meeting', meetingSchema); 