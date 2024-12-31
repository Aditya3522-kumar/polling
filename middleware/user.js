const User = require('../models/User');

const fetchCurrentUser = async (req, res, next) => {
    res.locals.currentUser = null;
    if (req.session.user_id) {
        try {
            const user = await User.findById(req.session.user_id);
            res.locals.currentUser = user;
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }
    next();
};

module.exports = {
    fetchCurrentUser
}; 