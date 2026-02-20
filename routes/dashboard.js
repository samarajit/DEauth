const router = require('express').Router();
const User = require('../models/User');
const { isFullyAuthed } = require('../middleware/auth');

// ─── User Dashboard ───
router.get('/', isFullyAuthed, async (req, res) => {
  res.render('dashboard', {
    user: req.user,
    page: 'overview'
  });
});

// ─── Edit Profile Page ───
router.get('/edit', isFullyAuthed, (req, res) => {
  res.render('edit-profile', {
    user: req.user,
    page: 'edit'
  });
});

// ─── Update Profile ───
router.post('/edit', isFullyAuthed, async (req, res) => {
  try {
    const { currentPassword, fullName, bio, website, location, role, timezone, newEmail, newUsername } = req.body;

    // Verify current password
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/dashboard/edit');
    }

    const errors = [];

    // Check new username if changed
    if (newUsername && newUsername.toLowerCase() !== user.username) {
      if (newUsername.length < 3 || newUsername.length > 30) {
        errors.push('Username must be between 3 and 30 characters.');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens.');
      }
      const existingUser = await User.findOne({
        username: newUsername.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUser) {
        errors.push('Username is already taken.');
      }
      if (errors.length === 0) {
        user.username = newUsername.toLowerCase();
      }
    }

    // Check new email if changed
    if (newEmail && newEmail.toLowerCase() !== user.email) {
      if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
        errors.push('Valid email is required.');
      }
      const existingEmail = await User.findOne({
        email: newEmail.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingEmail) {
        errors.push('Email is already in use.');
      }
      if (errors.length === 0) {
        user.email = newEmail.toLowerCase();
      }
    }

    if (errors.length > 0) {
      req.flash('error', errors.join(' '));
      return res.redirect('/dashboard/edit');
    }

    // Update fields
    user.fullName = fullName ? fullName.trim() : user.fullName;
    user.bio = bio !== undefined ? bio.trim() : user.bio;
    user.website = website !== undefined ? website.trim() : user.website;
    user.location = location !== undefined ? location.trim() : user.location;
    user.role = role || user.role;
    user.timezone = timezone || user.timezone;

    await user.save();

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Edit profile error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/dashboard/edit');
  }
});

// ─── Change Password ───
router.post('/change-password', isFullyAuthed, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/dashboard/settings');
    }

    if (!newPassword || newPassword.length < 8) {
      req.flash('error', 'New password must be at least 8 characters.');
      return res.redirect('/dashboard/settings');
    }

    if (newPassword !== confirmNewPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/dashboard/settings');
    }

    user.password = newPassword;
    await user.save();

    req.flash('success', 'Password changed successfully.');
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error('Change password error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/dashboard/settings');
  }
});

// ─── Settings Page ───
router.get('/settings', isFullyAuthed, (req, res) => {
  res.render('settings', {
    user: req.user,
    page: 'settings'
  });
});

// ─── Regenerate API Key ───
router.post('/regenerate-api-key', isFullyAuthed, async (req, res) => {
  try {
    const { currentPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Password is incorrect.');
      return res.redirect('/dashboard/settings');
    }

    user.generateApiKey();
    await user.save();

    req.flash('success', 'API key regenerated. Update your connected services.');
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error('Regenerate API key error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/dashboard/settings');
  }
});

module.exports = router;