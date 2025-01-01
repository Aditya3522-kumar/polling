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

// Add method to check if a user can view this poll
pollSchema.methods.canUserView = async function(userId) {
    // If poll is not group-specific (public), anyone can view
    if (!this.createdFor) {
        return true;
    }

    // If user is not logged in and poll is group-specific
    if (!userId) {
        return false;
    }

    // Find the group and check if user is a member
    const Group = mongoose.model('Group');
    const group = await Group.findById(this.createdFor);
    return group && group.members.includes(userId);
};

module.exports = mongoose.model('Poll', pollSchema); 