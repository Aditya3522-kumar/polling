const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    groupId: {
        type: String,
        unique: true,
        required: true
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    joinRequests: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        requestedAt: {
            type: Date,
            default: Date.now
        }
    }],
    polls: [{
        type: Schema.Types.ObjectId,
        ref: 'Poll'
    }]
}, { timestamps: true });

// Generate unique group ID
groupSchema.pre('save', async function(next) {
    if (this.isNew) {
        let isUnique = false;
        let newGroupId;
        
        while (!isUnique) {
            newGroupId = 'G' + Math.random().toString(36).substring(2, 7).toUpperCase();
            const existingGroup = await this.constructor.findOne({ groupId: newGroupId });
            if (!existingGroup) {
                isUnique = true;
                this.groupId = newGroupId;
            }
        }
    }
    next();
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group; 