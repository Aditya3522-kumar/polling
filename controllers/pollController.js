const Poll = require('../models/Poll');
const User = require('../models/User');
const Vote = require('../models/Vote');
const { catchAsync } = require('../middleware/error');

const pollController = {
    // Show all polls
    index: catchAsync(async (req, res) => {
        const polls = await Poll.find({}).populate('creator', 'username');
        res.render('polls/index', { polls });
    }),

    // Show create poll form
    renderCreateForm: (req, res) => {
        res.render('polls/new');
    },

    // Create new poll
    createPoll: catchAsync(async (req, res) => {
        const { title, description, options, startDate, endDate } = req.body;
        
        const poll = new Poll({
            title,
            description,
            creator: req.session.user_id,
            startDate,
            endDate,
            options: options.map(opt => ({ optionText: opt }))
        });

        await poll.save();
        
        await User.findByIdAndUpdate(req.session.user_id, {
            $push: { createdPolls: poll._id }
        });

        req.flash('success', 'Successfully created new poll!');
        res.redirect(`/polls/${poll._id}`);
    }),

    // Show single poll
    showPoll: async (req, res) => {
        try {
            const poll = await Poll.findById(req.params.id)
                                 .populate('creator', 'username');
            
            // Get all votes for this poll with voter information
            const votes = await Vote.find({ poll: req.params.id })
                                  .populate('user', 'username')
                                  .sort({ createdAt: -1 });
            
            if (!poll) {
                req.flash('error', 'Poll not found');
                return res.redirect('/polls');
            }

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
        } catch (error) {
            req.flash('error', 'Error loading poll');
            res.redirect('/polls');
        }
    },

    // Submit vote
    submitVote: async (req, res) => {
        try {
            const { pollId, optionId } = req.body;
            
            // Check if poll is still open
            const poll = await Poll.findById(pollId);
            if (!poll.isVotingOpen()) {
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
        } catch (error) {
            req.flash('error', 'Error submitting vote');
            res.redirect(`/polls/${req.body.pollId}`);
        }
    },

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

        await Poll.findByIdAndDelete(id);
        // Also delete associated votes
        await Vote.deleteMany({ poll: id });
        
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

        // Check if poll is closed
        if (poll.isVotingOpen()) {
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