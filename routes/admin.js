const router = require('express').Router();
const { prisma, UserUtils } = require('../models/User');
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
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'banned' } }),
      prisma.user.count({ where: { tags: { has: 'verified' } } }),
      prisma.user.count({ where: { tags: { has: 'blacklisted' } } }),
      prisma.user.count({ where: { tags: { has: 'whitelisted' } } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      })
    ]);

    const roleMap = {};
    roleCounts.forEach(r => { roleMap[r.role] = r._count.role; });

    console.log('Admin Stats:', { totalUsers, activeUsers, bannedUsers, verifiedUsers, blacklistedUsers, whitelistedUsers });

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
      recentUsers: UserUtils.attachMethodsArray(recentUsers)
    });
  } catch (err) {
    console.error('Admin dashboard error stack:', err.stack);
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

    let where = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { discordUsername: { contains: search, mode: 'insensitive' } },
        { discordId: search }
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;
    if (tag) where.tags = { has: tag };

    let sortObj = { createdAt: 'desc' };
    if (sort === 'username') sortObj = { username: 'asc' };
    if (sort === 'newest') sortObj = { createdAt: 'desc' };
    if (sort === 'oldest') sortObj = { createdAt: 'asc' };
    if (sort === 'lastLogin') sortObj = { lastLogin: 'desc' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: sortObj,
        skip: (currentPage - 1) * perPage,
        take: perPage
      }),
      prisma.user.count({ where })
    ]);

    res.render('admin/users', {
      page: 'admin-users',
      users: UserUtils.attachMethodsArray(users),
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
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
    res.render('admin/user-detail', {
      page: 'admin-users',
      targetUser: UserUtils.attachMethods(user)
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
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    if (user.isAdmin) {
      req.flash('error', 'Cannot ban an admin.');
      return res.redirect(`/admin/users/${user.id}`);
    }

    let updateData = {};
    if (user.status === 'banned') {
      updateData.status = 'active';
      updateData.banReason = null;
      updateData.bannedAt = null;
      req.flash('success', `${user.username} has been unbanned.`);
    } else {
      updateData.status = 'banned';
      updateData.banReason = req.body.banReason || 'No reason provided';
      updateData.bannedAt = new Date();
      req.flash('success', `${user.username} has been banned.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    res.redirect(`/admin/users/${user.id}`);
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

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    let newTags = [...user.tags];
    const tagIndex = newTags.indexOf(tag);
    if (tagIndex > -1) {
      newTags.splice(tagIndex, 1);
      req.flash('success', `Removed "${tag}" tag from ${user.username}.`);
    } else {
      newTags.push(tag);
      req.flash('success', `Added "${tag}" tag to ${user.username}.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { tags: newTags }
    });
    res.redirect(`/admin/users/${user.id}`);
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

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: role }
    });

    req.flash('success', `Role changed to "${role}" for ${user.username}.`);
    res.redirect(`/admin/users/${user.id}`);
  } catch (err) {
    console.error('Change role error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

// ─── Toggle Admin ───
router.post('/users/:id/toggle-admin', isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    if (user.id === req.user.id) {
      req.flash('error', 'Cannot modify your own admin status.');
      return res.redirect(`/admin/users/${user.id}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: !user.isAdmin }
    });

    req.flash('success', `${user.username} is ${!user.isAdmin ? 'now' : 'no longer'} an admin.`);
    res.redirect(`/admin/users/${user.id}`);
  } catch (err) {
    console.error('Toggle admin error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/admin/users');
  }
});

module.exports = router;