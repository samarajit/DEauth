const router = require('express').Router();
const { prisma, UserUtils } = require('../models/User');
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
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/auth/logout');
    }

    const isMatch = await UserUtils.comparePassword(user, currentPassword);
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
      const existingUser = await prisma.user.findFirst({
        where: {
          username: newUsername.toLowerCase(),
          id: { not: user.id }
        }
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
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: newEmail.toLowerCase(),
          id: { not: user.id }
        }
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
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: fullName ? fullName.trim() : user.fullName,
        bio: bio !== undefined ? bio.trim() : user.bio,
        website: website !== undefined ? website.trim() : user.website,
        location: location !== undefined ? location.trim() : user.location,
        role: role || user.role,
        timezone: timezone || user.timezone,
        username: user.username,
        email: user.email
      }
    });

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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/auth/logout');
    }

    const isMatch = await UserUtils.comparePassword(user, currentPassword);
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

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await UserUtils.hashPassword(newPassword) }
    });

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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/auth/logout');
    }

    const isMatch = await UserUtils.comparePassword(user, currentPassword);
    if (!isMatch) {
      req.flash('error', 'Password is incorrect.');
      return res.redirect('/dashboard/settings');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { apiKey: UserUtils.generateApiKey() }
    });

    req.flash('success', 'API key regenerated. Update your connected services.');
    res.redirect('/dashboard/settings');
  } catch (err) {
    console.error('Regenerate API key error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/dashboard/settings');
  }
});

module.exports = router;