const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const optionSchema = new Schema({
    optionText: {
        type: String,
        required: true
    },
    voteCount: {
        type: Number,
        default: 0
    }
});

const pollSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    options: [optionSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    totalVotes: {
        type: Number,
        default: 0
    },
    isResultDeclared: {
        type: Boolean,
        default: false
    },
    resultDeclarationText: {
        type: String,
        default: ''
    },
    resultDeclaredAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Add methods to check if poll is active
pollSchema.methods.isVotingOpen = function() {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate && this.isActive;
};

module.exports = mongoose.model('Poll', pollSchema); 