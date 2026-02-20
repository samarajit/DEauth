const router = require('express').Router();
const User = require('../models/User');
const { isAdmin } = require('../middleware/auth');

// ─── Admin Dashboard ───
router.get('/', isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      verifiedUsers,
      blacklistedUsers,
      whitelistedUsers,
      recentUsers,
      roleCounts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'banned' }),
      User.countDocuments({ tags: 'verified' }),
      User.countDocuments({ tags: 'blacklisted' }),
      User.countDocuments({ tags: 'whitelisted' }),
      User.find().sort({ createdAt: -1 }).limit(10),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    ]);

    const roleMap = {};
    roleCounts.forEach(r => { roleMap[r._id] = r.count; });

    res.render('admin/dashboard', {
      page: 'admin-overview',
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        verifiedUsers,
        blacklistedUsers,
        whitelistedUsers,
        roles: roleMap
      },
      recentUsers
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/dashboard');
  }
});

// ─── Users List ───
router.get('/users', isAdmin, async (req, res) => {
  try {
    const { search, status, role, tag, sort, page: pageNum } = req.query;
    const perPage = 20;
    const currentPage = parseInt(pageNum) || 1;

    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { discordUsername: { $regex: search, $options: 'i' } },
        { discordId: search }
      ];
    }
    if (status) query.status = status;
    if (role) query.role = role;
    if (tag) query.tags = tag;

    let sortObj = { createdAt: -1 };
    if (sort === 'username') sortObj = { username: 1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'lastLogin') sortObj = { lastLogin: -1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sortObj)
        .skip((currentPage - 1) * perPage)
        .limit(perPage),
      User.countDocuments(query)
    ]);

    res.render('admin/users', {
      page: 'admin-users',
      users,
      pagination: {
        current: currentPage,
        pages: Math.ceil(total / perPage),
        total
      },
      filters: { search, status, role, tag, sort }
    });
  } catch (err) {
    console.error('Admin users error:', err);
    req.flash('error', 'Failed to load users.');
    res.redirect('/admin');
  }
});

// ─── User Detail ───
router.get('/users/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
    res.render('admin/user-detail', {
      page: 'admin-users',
      targetUser: user
    });
  } catch (err) {
    console.error('User detail error:', err);
    req.flash('error', 'Failed to load user.');
    res.redirect('/admin/users');
  }
});

// ─── Toggle Ban ───
router.post('/users/:id/toggle-ban', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    if (user.isAdmin) {
      req.flash('error', 'Cannot ban an admin.');
      return res.redirect(`/admin/users/${user._id}`);
    }

    if (user.status === 'banned') {
      user.status = 'active';
      user.banReason = null;
      user.bannedAt = null;
      user.bannedBy = null;
      req.flash('success', `${user.username} has been unbanned.`);
    } else {
      user.status = 'banned';
      user.banReason = req.body.banReason || 'No reason provided';
      user.bannedAt = Date.now();
      user.bannedBy = req.user._id;
      req.flash('success', `${user.username} has been banned.`);
    }

    await user.save();
    res.redirect(`/admin/users/${user._id}`);
  } catch (err) {
    console.error('Toggle ban error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

// ─── Toggle Tag ───
router.post('/users/:id/toggle-tag', isAdmin, async (req, res) => {
  try {
    const { tag } = req.body;
    const validTags = ['verified', 'blacklisted', 'whitelisted'];

    if (!validTags.includes(tag)) {
      req.flash('error', 'Invalid tag.');
      return res.redirect(`/admin/users/${req.params.id}`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    const tagIndex = user.tags.indexOf(tag);
    if (tagIndex > -1) {
      user.tags.splice(tagIndex, 1);
      req.flash('success', `Removed "${tag}" tag from ${user.username}.`);
    } else {
      user.tags.push(tag);
      req.flash('success', `Added "${tag}" tag to ${user.username}.`);
    }

    await user.save();
    res.redirect(`/admin/users/${user._id}`);
  } catch (err) {
    console.error('Toggle tag error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

// ─── Change Role ───
router.post('/users/:id/change-role', isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['engineering', 'coding', 'arts', 'literature', 'other'];

    if (!validRoles.includes(role)) {
      req.flash('error', 'Invalid role.');
      return res.redirect(`/admin/users/${req.params.id}`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    user.role = role;
    await user.save();

    req.flash('success', `Role changed to "${role}" for ${user.username}.`);
    res.redirect(`/admin/users/${user._id}`);
  } catch (err) {
    console.error('Change role error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

// ─── Toggle Admin ───
router.post('/users/:id/toggle-admin', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    if (user._id.equals(req.user._id)) {
      req.flash('error', 'Cannot modify your own admin status.');
      return res.redirect(`/admin/users/${user._id}`);
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    req.flash('success', `${user.username} is ${user.isAdmin ? 'now' : 'no longer'} an admin.`);
    res.redirect(`/admin/users/${user._id}`);
  } catch (err) {
    console.error('Toggle admin error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

module.exports = router;