require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const flash = require('connect-flash');
const path = require('path');

const connectDB = require('./config/database');
const User = require('./models/User');

const app = express();

// ─── Database ───
connectDB();

// ─── View Engine ───
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static Files ───
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsers ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session ───
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// ─── Flash Messages ───
app.use(flash());

// ─── Passport ───
app.use(passport.initialize());
app.use(passport.session());

// Discord Strategy
const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ discordId: profile.id });

    if (user) {
      // Update discord info on each login
      user.discordUsername = profile.username;
      user.discordGlobalName = profile.global_name || profile.username;
      user.discordAvatar = profile.avatar;
      user.discordEmail = profile.email;
      user.lastLogin = Date.now();

      // Check if user should be admin
      if (adminIds.includes(profile.id) && !user.isAdmin) {
        user.isAdmin = true;
      }

      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = new User({
      discordId: profile.id,
      discordUsername: profile.username,
      discordGlobalName: profile.global_name || profile.username,
      discordAvatar: profile.avatar,
      discordEmail: profile.email,
      isAdmin: adminIds.includes(profile.id),
      lastLogin: Date.now()
    });

    newUser.generateApiKey();
    await newUser.save();
    return done(null, newUser);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ─── Global Template Variables ───
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// ─── Routes ───
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// Landing page
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    if (!req.user.profileCompleted) {
      return res.redirect('/auth/complete-profile');
    }
    if (req.user.status === 'banned') {
      return res.redirect('/banned');
    }
    return res.redirect('/dashboard');
  }
  res.render('landing');
});

// Banned page
app.get('/banned', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  if (req.user.status !== 'banned') return res.redirect('/dashboard');
  res.render('banned', { user: req.user });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404',
    message: 'Page not found',
    description: 'The page you are looking for does not exist.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500',
    message: 'Server Error',
    description: 'Something went wrong on our end.'
  });
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ████████████████████');
  console.log('  │  DEauth Server │');
  console.log('  ████████████████████');
  console.log(`  ✓ Server running on port ${PORT}`);
  console.log(`  ✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✓ URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
  console.log('');
});