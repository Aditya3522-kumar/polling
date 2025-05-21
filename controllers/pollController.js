const Poll = require('../models/Poll');
const User = require('../models/User');
const Vote = require('../models/Vote');
const { catchAsync } = require('../middleware/error');
const Group = require('../models/Group');

const pollController = {
    // Show all polls
    index: catchAsync(async (req, res) => {
        let query = {};

        if (req.session.user_id) {
            // If user is logged in, show public polls and polls from their groups
            const user = await User.findById(req.session.user_id);
            query = {
                $or: [
                    { createdFor: null }, // Public polls
                    { createdFor: { $in: user.groups } } // Polls from user's groups
                ]
            };
        } else {
            // If not logged in, only show public polls
            query = { createdFor: null };
        }

        const polls = await Poll.find(query)
            .populate('creator', 'username')
            .populate('createdFor', 'name groupId')
            .sort({ createdAt: -1 });

        res.render('polls/index', { polls });
    }),

    // Show create poll form
    renderCreateForm: catchAsync(async (req, res) => {
        // Fetch user's groups
        const user = await User.findById(req.session.user_id)
            .populate({
                path: 'groups',
                select: 'name groupId',
                model: 'Group'
            });

        // Pass the groups to the template
        res.render('polls/new', { userGroups: user.groups });
    }),

    // Create new poll
    createPoll: catchAsync(async (req, res) => {
        const { title, description, options, createdFor } = req.body;

        // Create poll with group reference if selected
        const poll = new Poll({
            title,
            description,
            creator: req.session.user_id,
            createdFor: createdFor || null, // If no group selected, it's a public poll
            // Removed startDate and endDate as per your update
            options: options.map(opt => ({ optionText: opt }))
        });

        await poll.save();

        // Add poll to user's createdPolls
        await User.findByIdAndUpdate(req.session.user_id, {
            $push: { createdPolls: poll._id }
        });

        // If poll is created for a group, add it to the group's polls
        if (createdFor) {
            await Group.findByIdAndUpdate(createdFor, {
                $push: { polls: poll._id }
            });
        }

        req.flash('success', 'Successfully created new poll!');
        res.redirect(`/polls/${poll._id}`);
    }),

    // Show single poll
    showPoll: catchAsync(async (req, res) => {
        const poll = await Poll.findById(req.params.id)
            .populate('creator', 'username')
            .populate('createdFor', 'name groupId');

        if (!poll) {
            req.flash('error', 'Poll not found');
            return res.redirect('/polls');
        }

        // Check if user can view this poll
        const canView = await poll.canUserView(req.session.user_id);
        if (!canView) {
            req.flash('error', 'You do not have permission to view this poll');
            return res.redirect('/polls');
        }

        // Get all votes for this poll with voter information
        const votes = await Vote.find({ poll: req.params.id })
            .populate('user', 'username')
            .sort({ createdAt: -1 });

        // Check if user has already voted
        let hasVoted = false;
        if (req.session.user_id) {
            const vote = await Vote.findOne({
                user: req.session.user_id,
                poll: poll._id
            });
            hasVoted = !!vote;
        }

        res.render('polls/show', { poll, hasVoted, votes });
    }),

    // Submit vote
    submitVote: catchAsync(async (req, res) => {
        const { pollId, optionId } = req.body;

        // Check if poll is still open based on isActive
        const poll = await Poll.findById(pollId);
        if (!poll.isActive) {
            req.flash('error', 'This poll is closed');
            return res.redirect(`/polls/${pollId}`);
        }

        // Create vote
        const vote = new Vote({
            user: req.session.user_id,
            poll: pollId,
            option: optionId
        });

        await vote.save();

        // Update poll option vote count and total votes
        await Poll.findOneAndUpdate(
            { _id: pollId, "options._id": optionId },
            { 
                $inc: {
                    "options.$.voteCount": 1,
                    totalVotes: 1
                }
            }
        );

        // Add poll to user's voted polls
        await User.findByIdAndUpdate(req.session.user_id, {
            $push: { votedPolls: pollId }
        });

        req.flash('success', 'Vote submitted successfully!');
        res.redirect(`/polls/${pollId}`);
    }),

    deletePoll: catchAsync(async (req, res) => {
        const { id } = req.params;
        const poll = await Poll.findById(id);

        if (!poll) {
            req.flash('error', 'Poll not found');
            return res.redirect('/polls');
        }

        // Check if current user is the creator
        if (!poll.creator.equals(req.session.user_id)) {
            req.flash('error', 'You do not have permission to delete this poll');
            return res.redirect(`/polls/${id}`);
        }

        // Remove poll from creator's createdPolls
        await User.findByIdAndUpdate(poll.creator, {
            $pull: { createdPolls: poll._id }
        });

        // Remove poll from group if it's a group poll
        if (poll.createdFor) {
            await Group.findByIdAndUpdate(poll.createdFor, {
                $pull: { polls: poll._id }
            });
        }

        // Remove poll from votedPolls of all users who voted
        await User.updateMany(
            { votedPolls: poll._id },
            { $pull: { votedPolls: poll._id } }
        );

        // Delete all votes associated with this poll
        await Vote.deleteMany({ poll: poll._id });

        // Finally delete the poll
        await Poll.findByIdAndDelete(id);

        req.flash('success', 'Successfully deleted poll');
        res.redirect('/polls');
    }),

    declareResult: catchAsync(async (req, res) => {
        const { id } = req.params;
        const { resultText } = req.body;
        const poll = await Poll.findById(id);

        if (!poll) {
            req.flash('error', 'Poll not found');
            return res.redirect('/polls');
        }

        // Check if current user is the creator
        if (!poll.creator.equals(req.session.user_id)) {
            req.flash('error', 'You do not have permission to declare results');
            return res.redirect(`/polls/${id}`);
        }

        // Check if poll is closed based on isActive flag
        if (poll.isActive) {
            req.flash('error', 'Cannot declare results while poll is still open');
            return res.redirect(`/polls/${id}`);
        }

        // Update poll with results
        await Poll.findByIdAndUpdate(id, {
            isResultDeclared: true,
            resultDeclarationText: resultText,
            resultDeclaredAt: new Date()
        });

        req.flash('success', 'Results declared successfully');
        res.redirect(`/polls/${id}`);
    })
};

module.exports = pollController;