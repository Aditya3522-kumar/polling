const User = require('../models/User');
const bcrypt = require('bcrypt');

const userController = {
    // Render signup form
    renderSignup: (req, res) => {
        res.render('users/signup');
    },

    // Handle signup
    signup: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ 
                $or: [{ email }, { username }] 
            });
            
            if (existingUser) {
                req.flash('error', 'Username or email already exists');
                return res.redirect('/signup');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // Create new user
            const user = new User({
                username,
                email,
                password: hashedPassword
            });
            
            await user.save();
            req.flash('success', 'Welcome! Successfully signed up!');
            req.session.user_id = user._id; // Log the user in
            res.redirect('/');
            
        } catch (error) {
            req.flash('error', 'Error creating user');
            res.redirect('/signup');
        }
    },

    // Render login form
    renderLogin: (req, res) => {
        // Store the return URL in session if provided
        if (req.query.returnTo) {
            req.session.returnTo = req.query.returnTo;
        }
        res.render('users/login');
    },

    // Handle login
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });
            
            if (!user) {
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                req.flash('error', 'Invalid username or password');
                return res.redirect('/login');
            }

            req.session.user_id = user._id;
            req.flash('success', 'Welcome back!');
            
            // Redirect to stored URL or default to home
            const redirectUrl = req.session.returnTo || '/';
            delete req.session.returnTo; // Clear stored URL
            res.redirect(redirectUrl);
        } catch (error) {
            req.flash('error', 'Error logging in');
            res.redirect('/login');
        }
    }
};

module.exports = userController; 