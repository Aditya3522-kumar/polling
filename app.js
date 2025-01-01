require('./models/User');
require('./models/Poll');
require('./models/Group');
require('./models/Vote');

process.removeAllListeners('warning');
const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const userController = require('./controllers/userController');
const pollController = require('./controllers/pollController');
const { isLoggedIn, isNotLoggedIn, allowAnonymous } = require('./middleware/auth');
const { fetchCurrentUser } = require('./middleware/user');
const methodOverride = require('method-override');
const profileController = require('./controllers/profileController');
const groupController = require('./controllers/groupController');
const groupRoutes = require('./routes/groupRoutes');
require('dotenv').config();

const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Database connected");
    })
    .catch(err => {
        console.log("MongoDB connection error:", err);
    });

// EJS setup
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));
app.use(flash());
app.use(methodOverride('_method'));

// Global middleware
app.use(fetchCurrentUser);

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        const recentPolls = await Poll.find({})
            .populate('creator', 'username')
            .sort({ createdAt: -1 })
            .limit(6);
        res.render('home', { recentPolls });
    } catch (error) {
        console.error(error);
        res.render('home', { recentPolls: [] });
    }
});

app.get('/explore', (req, res) => {
    res.redirect('/');  // For now, redirect to home page
});

app.get('/login', isNotLoggedIn, userController.renderLogin);
app.get('/signup', isNotLoggedIn, userController.renderSignup);

app.post('/login', isNotLoggedIn, userController.login);
app.post('/signup', isNotLoggedIn, userController.signup);

// Add a logout route
app.get('/logout', (req, res) => {
    req.session.user_id = null;
    req.flash('success', 'Goodbye!');
    res.redirect('/');
});

// Poll routes
app.get('/polls', allowAnonymous, pollController.index);
app.get('/polls/new', isLoggedIn, pollController.renderCreateForm);
app.post('/polls', isLoggedIn, pollController.createPoll);
app.get('/polls/:id', allowAnonymous, pollController.showPoll);
app.post('/polls/:id/vote', isLoggedIn, pollController.submitVote);
app.delete('/polls/:id', isLoggedIn, pollController.deletePoll);
app.post('/polls/:id/declare-result', isLoggedIn, pollController.declareResult);

// Profile routes
app.get('/profile', isLoggedIn, profileController.showProfile);
app.post('/profile', isLoggedIn, profileController.updateProfile);
app.post('/profile/picture', isLoggedIn, profileController.updateProfilePicture);

// Group routes
app.get('/groups', isLoggedIn, groupController.index);
app.get('/groups/my', isLoggedIn, groupController.myGroups);
app.get('/groups/search', isLoggedIn, groupController.searchGroups);
app.post('/groups', isLoggedIn, groupController.createGroup);
app.get('/groups/:id', isLoggedIn, groupController.showGroup);
app.use('/groups', groupRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something went wrong!';
    res.status(statusCode).render('error', { err });
});

const port = process.env.PORT || 8800;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
