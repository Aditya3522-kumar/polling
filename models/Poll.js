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
    createdFor: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default: null
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

// Removed isVotingOpen function since time is no longer used

// Keep user access check
pollSchema.methods.canUserView = async function(userId) {
    if (!this.createdFor) return true;
    if (!userId) return false;

    const Group = mongoose.model('Group');
    const group = await Group.findById(this.createdFor);
    return group && group.members.includes(userId);
};

module.exports = mongoose.model('Poll', pollSchema);