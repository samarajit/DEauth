const router = require('express').Router();
const { prisma, UserUtils } = require('../models/User');
const { apiKeyAuth, adminApiAuth } = require('../middleware/auth');

// ─── Verify current user (for Wakatime etc.) ───
// GET /api/me
router.get('/me', apiKeyAuth, (req, res) => {
  const user = req.apiUser;
  res.json({
    success: true,
    user: UserUtils.toServiceJSON(user)
  });
});

// ─── Check if user can access a service ───
// GET /api/access-check
router.get('/access-check', apiKeyAuth, (req, res) => {
  const user = req.apiUser;
  res.json({
    success: true,
    userId: user.id,
    username: user.username,
    canAccess: UserUtils.canAccessServices(user),
    status: user.status,
    isBanned: UserUtils.isBanned(user),
    isBlacklisted: UserUtils.isBlacklisted(user),
    isVerified: UserUtils.hasTag(user, 'verified'),
    isWhitelisted: UserUtils.hasTag(user, 'whitelisted'),
    role: user.role,
    tags: user.tags
  });
});

// ─── Get user by ID (admin only) ───
// GET /api/users/:id
router.get('/users/:id', adminApiAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({
      success: true,
      user: UserUtils.toServiceJSON(user)
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
    let where = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;
    if (tag) where.tags = { has: tag };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 50
    });

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => UserUtils.toServiceJSON(u))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ─── Verify user by username (for external services) ───
// GET /api/verify/:username
router.get('/verify/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        status: user.status,
        canAccess: UserUtils.canAccessServices(user),
        tags: user.tags,
        role: user.role,
        avatar: UserUtils.getAvatarURL(user)
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
    service: 'DEauth',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;