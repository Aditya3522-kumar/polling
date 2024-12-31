const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    poll: {
        type: Schema.Types.ObjectId,
        ref: 'Poll',
        required: true
    },
    option: {
        type: Schema.Types.ObjectId,
        required: true
    }
}, {
    timestamps: true
});

// Ensure one vote per user per poll
voteSchema.index({ user: 1, poll: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema); 