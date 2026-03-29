// ─── Authentication & Authorization Middleware ───
const { prisma, UserUtils } = require('../models/User');

// Check if user is logged in
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  res.redirect('/');
};

// Check if profile is complete
exports.isProfileComplete = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  if (!req.user.profileCompleted) {
    return res.redirect('/auth/complete-profile');
  }
  next();
};

// Check if user is NOT banned (use after isAuthenticated)
exports.isNotBanned = (req, res, next) => {
  if (req.user && req.user.status === 'banned') {
    return res.redirect('/banned');
  }
  next();
};

// Combined: authenticated + profile complete + not banned
exports.isFullyAuthed = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/');
  }
  if (req.user.status === 'banned') {
    return res.redirect('/banned');
  }
  if (!req.user.profileCompleted) {
    return res.redirect('/auth/complete-profile');
  }
  next();
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }
  if (!req.user.isAdmin) {
    req.flash('error', 'Access denied.');
    return res.redirect('/dashboard');
  }
  next();
};

// API key authentication (for external services like Wakatime)
exports.apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] ||
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Pass via X-API-Key header, Authorization Bearer, or api_key query param.'
    });
  }

  try {
    const user = await prisma.user.findFirst({ where: { apiKey } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid API key.' });
    }

    req.apiUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
};

// Admin API key auth
exports.adminApiAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] ||
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required.' });
  }

  try {
    const user = await prisma.user.findFirst({ where: { apiKey } });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required.' });
    }

    req.apiUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
};