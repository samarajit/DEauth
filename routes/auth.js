const router = require('express').Router();
const passport = require('passport');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// ─── Discord OAuth2 Login ───
router.get('/discord', passport.authenticate('discord'));

// ─── Discord Callback ───
router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/', failureFlash: true }),
  (req, res) => {
    if (req.user.status === 'banned') {
      return res.redirect('/banned');
    }
    if (!req.user.profileCompleted) {
      return res.redirect('/auth/complete-profile');
    }
    res.redirect('/dashboard');
  }
);

// ─── Complete Profile Page ───
router.get('/complete-profile', isAuthenticated, (req, res) => {
  if (req.user.profileCompleted) {
    return res.redirect('/dashboard');
  }
  res.render('complete-profile', { user: req.user });
});

// ─── Complete Profile Submit ───
router.post('/complete-profile', isAuthenticated, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullName, bio, website, location, role, timezone } = req.body;

    // Validation
    const errors = [];

    if (!username || username.length < 3 || username.length > 30) {
      errors.push('Username must be between 3 and 30 characters.');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens.');
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push('Valid email is required.');
    }
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters.');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match.');
    }
    if (!fullName || fullName.trim().length === 0) {
      errors.push('Full name is required.');
    }

    // Check unique username
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user._id }
    });
    if (existingUsername) {
      errors.push('Username is already taken.');
    }

    // Check unique email
    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.user._id }
    });
    if (existingEmail) {
      errors.push('Email is already in use.');
    }

    if (errors.length > 0) {
      req.flash('error', errors.join(' '));
      return res.redirect('/auth/complete-profile');
    }

    // Update user
    const user = await User.findById(req.user._id);
    user.username = username.toLowerCase();
    user.email = email.toLowerCase();
    user.password = password; // will be hashed by pre-save hook
    user.fullName = fullName.trim();
    user.bio = bio ? bio.trim() : '';
    user.website = website ? website.trim() : '';
    user.location = location ? location.trim() : '';
    user.role = role || 'other';
    user.timezone = timezone || 'UTC';
    user.profileCompleted = true;

    if (!user.apiKey) {
      user.generateApiKey();
    }

    await user.save();

    req.flash('success', 'Welcome to Tree! Your profile is complete.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Profile completion error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/complete-profile');
  }
});

// ─── Logout ───
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    req.flash('info', 'You have been logged out.');
    res.redirect('/');
  });
});

module.exports = router;