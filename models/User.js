const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: '/images/default-avatar.png'
    },
    bio: {
        type: String,
        default: ''
    },
    createdPolls: [{
        type: Schema.Types.ObjectId,
        ref: 'Poll'
    }],
    votedPolls: [{
        type: Schema.Types.ObjectId,
        ref: 'Poll'
    }],
    groups: [{
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }],
    adminGroups: [{
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }]
}, { timestamps: true });

// Add method to get user's accessible polls (public + group polls)
UserSchema.methods.getAccessiblePolls = async function() {
    return await mongoose.model('Poll').find({
        $or: [
            { createdFor: null },
            { createdFor: { $in: this.groups } }
        ]
    }).populate('createdFor', 'name groupId');
};

module.exports = mongoose.model('User', UserSchema); 