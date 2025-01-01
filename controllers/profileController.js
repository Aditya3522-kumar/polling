const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const { catchAsync } = require('../middleware/error');

const profileController = {
    // Show user profile
    showProfile: catchAsync(async (req, res) => {
        const user = await User.findById(req.session.user_id)
            .populate({
                path: 'groups',
                select: 'name groupId admin',
                populate: {
                    path: 'admin',
                    select: 'username'
                }
            })
            .populate({
                path: 'createdPolls',
                select: 'title createdAt createdFor',
                populate: {
                    path: 'createdFor',
                    select: 'name groupId'
                }
            })
            .populate({
                path: 'votedPolls',
                select: 'title createdFor',
                populate: {
                    path: 'createdFor',
                    select: 'name groupId'
                }
            });

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        // Separate polls by type (public vs group)
        const publicPolls = user.createdPolls.filter(poll => !poll.createdFor);
        const groupPolls = user.createdPolls.filter(poll => poll.createdFor);

        res.render('users/profile', { 
            profileUser: user,
            publicPolls,
            groupPolls
        });
    }),

    // Update profile
    updateProfile: catchAsync(async (req, res) => {
        const { bio } = req.body;
        
        await User.findByIdAndUpdate(req.session.user_id, { bio });
        
        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    }),

    // Update profile picture
    updateProfilePicture: catchAsync(async (req, res) => {
        // For now, just redirect back
        // We'll implement file upload later
        req.flash('info', 'Profile picture update feature coming soon!');
        res.redirect('/profile');
    })
};

module.exports = profileController; 