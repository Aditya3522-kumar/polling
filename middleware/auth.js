const isLoggedIn = (req, res, next) => {
    if (!req.session.user_id) {
        req.flash('error', 'You must be logged in first');
        return res.redirect('/login');
    }
    next();
};

const isNotLoggedIn = (req, res, next) => {
    if (req.session.user_id) {
        req.flash('error', 'You are already logged in');
        return res.redirect('/');
    }
    next();
};

const allowAnonymous = (req, res, next) => {
    res.locals.isAnonymous = !req.session.user_id;
    next();
};

module.exports = {
    isLoggedIn,
    isNotLoggedIn,
    allowAnonymous
}; 