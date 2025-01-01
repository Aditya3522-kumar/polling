const Group = require('../models/Group');
const User = require('../models/User');
const { catchAsync } = require('../middleware/error');

const groupController = {
    // Show all groups
    index: catchAsync(async (req, res) => {
        const groups = await Group.find({})
            .populate('admin', 'username')
            .populate('members', 'username')
            .sort({ createdAt: -1 });
        res.render('groups/index', { groups });
    }),

    // Show my groups
    myGroups: catchAsync(async (req, res) => {
        const user = await User.findById(req.session.user_id)
            .populate({
                path: 'groups',
                populate: { 
                    path: 'admin',
                    select: 'username'
                }
            });
        res.render('groups/my-groups', { groups: user.groups });
    }),

    // Create new group
    createGroup: catchAsync(async (req, res) => {
        try {
            const { name, description } = req.body;
            
            // Generate a unique group ID
            let isUnique = false;
            let groupId;
            while (!isUnique) {
                groupId = 'G' + Math.random().toString(36).substring(2, 7).toUpperCase();
                const existingGroup = await Group.findOne({ groupId });
                if (!existingGroup) {
                    isUnique = true;
                }
            }

            const group = new Group({
                name,
                description,
                groupId, // Add the generated groupId
                admin: req.session.user_id,
                members: [req.session.user_id]
            });

            await group.save();

            // Update user's adminGroups and groups
            await User.findByIdAndUpdate(req.session.user_id, {
                $push: { 
                    adminGroups: group._id,
                    groups: group._id
                }
            });

            req.flash('success', 'Group created successfully!');
            res.redirect(`/groups/${group._id}`);
        } catch (error) {
            req.flash('error', error.message);
            res.redirect('/groups');
        }
    }),

    // Search groups page
    searchGroups: catchAsync(async (req, res) => {
        const { query } = req.query;
        let groups = [];
        
        if (query) {
            groups = await Group.find({
                $or: [
                    { groupId: { $regex: query, $options: 'i' } },
                    { name: { $regex: query, $options: 'i' } }
                ]
            })
            .populate('admin', 'username')
            .populate('members', 'username')
            .sort({ createdAt: -1 });
        }
        
        res.render('groups/search', { groups, query });
    }),

    // Show single group
    showGroup: catchAsync(async (req, res) => {
        const group = await Group.findById(req.params.id)
            .populate('admin', 'username email')
            .populate('members', 'username email')
            .populate({
                path: 'polls',
                populate: { 
                    path: 'creator',
                    select: 'username'
                }
            })
            .populate({
                path: 'joinRequests.user',
                select: 'username'
            });

        if (!group) {
            req.flash('error', 'Group not found');
            return res.redirect('/groups');
        }

        res.render('groups/show', { group });
    }),

    joinGroup: catchAsync(async (req, res) => {
        const { id } = req.params;
        const group = await Group.findById(id);
        
        if (!group) {
            req.flash('error', 'Group not found');
            return res.redirect('/groups');
        }

        // Check if user is already a member
        if (group.members.includes(req.session.user_id)) {
            req.flash('error', 'You are already a member of this group');
            return res.redirect(`/groups/${id}`);
        }

        // Check if user already has a pending request
        const existingRequest = group.joinRequests.find(
            request => request.user.equals(req.session.user_id)
        );
        if (existingRequest) {
            req.flash('error', 'You already have a pending join request');
            return res.redirect(`/groups/${id}`);
        }

        // Add join request
        await Group.findByIdAndUpdate(id, {
            $push: { joinRequests: { user: req.session.user_id } }
        });

        req.flash('success', 'Join request sent! Waiting for admin approval.');
        res.redirect(`/groups/${id}`);
    }),

    leaveGroup: catchAsync(async (req, res) => {
        const { id } = req.params;
        const group = await Group.findById(id);
        
        if (!group) {
            req.flash('error', 'Group not found');
            return res.redirect('/groups');
        }

        // Check if user is the admin
        if (group.admin.equals(req.session.user_id)) {
            req.flash('error', 'Admin cannot leave the group');
            return res.redirect(`/groups/${id}`);
        }

        // Remove user from group members
        await Group.findByIdAndUpdate(id, {
            $pull: { members: req.session.user_id }
        });

        // Remove group from user's groups
        await User.findByIdAndUpdate(req.session.user_id, {
            $pull: { groups: id }
        });

        req.flash('success', 'Successfully left the group');
        res.redirect('/groups');
    }),

    approveJoinRequest: catchAsync(async (req, res) => {
        const { groupId, userId } = req.params;
        const group = await Group.findById(groupId);

        // Verify admin permission
        if (!group.admin.equals(req.session.user_id)) {
            req.flash('error', 'Only admin can approve join requests');
            return res.redirect(`/groups/${groupId}`);
        }

        // Remove join request and add to members
        await Group.findByIdAndUpdate(groupId, {
            $pull: { joinRequests: { user: userId } },
            $push: { members: userId }
        });

        // Add group to user's groups
        await User.findByIdAndUpdate(userId, {
            $push: { groups: groupId }
        });

        req.flash('success', 'Join request approved');
        res.redirect(`/groups/${groupId}`);
    }),

    rejectJoinRequest: catchAsync(async (req, res) => {
        const { groupId, userId } = req.params;
        const group = await Group.findById(groupId);

        // Verify admin permission
        if (!group.admin.equals(req.session.user_id)) {
            req.flash('error', 'Only admin can reject join requests');
            return res.redirect(`/groups/${groupId}`);
        }

        // Remove join request
        await Group.findByIdAndUpdate(groupId, {
            $pull: { joinRequests: { user: userId } }
        });

        req.flash('success', 'Join request rejected');
        res.redirect(`/groups/${groupId}`);
    })
};

module.exports = groupController; 