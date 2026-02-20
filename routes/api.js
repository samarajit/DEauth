const router = require('express').Router();
const User = require('../models/User');
const { apiKeyAuth, adminApiAuth } = require('../middleware/auth');

// ─── Verify current user (for Wakatime etc.) ───
// GET /api/me
router.get('/me', apiKeyAuth, (req, res) => {
  const user = req.apiUser;
  res.json({
    success: true,
    user: user.toServiceJSON()
  });
});

// ─── Check if user can access a service ───
// GET /api/access-check
router.get('/access-check', apiKeyAuth, (req, res) => {
  const user = req.apiUser;
  res.json({
    success: true,
    userId: user._id,
    username: user.username,
    canAccess: user.canAccessServices(),
    status: user.status,
    isBanned: user.isBanned(),
    isBlacklisted: user.isBlacklisted(),
    isVerified: user.hasTag('verified'),
    isWhitelisted: user.hasTag('whitelisted'),
    role: user.role,
    tags: user.tags
  });
});

// ─── Get user by ID (admin only) ───
// GET /api/users/:id
router.get('/users/:id', adminApiAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({
      success: true,
      user: user.toServiceJSON()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ─── Search users (admin only) ───
// GET /api/users?search=&status=&role=&tag=
router.get('/users', adminApiAuth, async (req, res) => {
  try {
    const { search, status, role, tag, limit } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (role) query.role = role;
    if (tag) query.tags = tag;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50);

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => u.toServiceJSON())
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ─── Verify user by username (for external services) ───
// GET /api/verify/:username
router.get('/verify/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        status: user.status,
        canAccess: user.canAccessServices(),
        tags: user.tags,
        role: user.role,
        avatar: user.getAvatarURL()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ─── Health check ───
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Tree Auth',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;