const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
  // ─── Discord OAuth Data ───
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  discordUsername: { type: String },
  discordGlobalName: { type: String },
  discordAvatar: { type: String },
  discordEmail: { type: String },

  // ─── Profile Data (user fills via form) ───
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: { type: String },
  fullName: { type: String, trim: true, maxlength: 100 },
  bio: { type: String, maxlength: 500 },
  website: { type: String, trim: true },
  location: { type: String, trim: true, maxlength: 100 },
  timezone: { type: String, default: 'UTC' },

  // ─── Role ───
  role: {
    type: String,
    enum: ['engineering', 'coding', 'arts', 'literature', 'other'],
    default: 'other'
  },

  // ─── Tags (multiple allowed) ───
  tags: [{
    type: String,
    enum: ['verified', 'blacklisted', 'whitelisted']
  }],

  // ─── Status ───
  status: {
    type: String,
    enum: ['active', 'banned', 'suspended'],
    default: 'active'
  },
  banReason: { type: String },
  bannedAt: { type: Date },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ─── Admin ───
  isAdmin: { type: Boolean, default: false },

  // ─── API Key (for Wakatime / external service integration) ───
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // ─── Profile Completion ───
  profileCompleted: { type: Boolean, default: false },

  // ─── Timestamps ───
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate API key
UserSchema.methods.generateApiKey = function () {
  this.apiKey = `tree_${uuidv4().replace(/-/g, '')}`;
  return this.apiKey;
};

// Get avatar URL
UserSchema.methods.getAvatarURL = function (size = 128) {
  if (this.discordAvatar) {
    return `https://cdn.discordapp.com/avatars/${this.discordId}/${this.discordAvatar}.png?size=${size}`;
  }
  const defaultAvatar = parseInt(this.discordId) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png?size=${size}`;
};

// Check tag
UserSchema.methods.hasTag = function (tag) {
  return this.tags.includes(tag);
};

// Check if banned
UserSchema.methods.isBanned = function () {
  return this.status === 'banned';
};

// Check if blacklisted
UserSchema.methods.isBlacklisted = function () {
  return this.tags.includes('blacklisted');
};

// Check if user can access services
UserSchema.methods.canAccessServices = function () {
  return this.status === 'active' && !this.tags.includes('blacklisted');
};

// Public profile (safe to expose)
UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    fullName: this.fullName,
    bio: this.bio,
    role: this.role,
    tags: this.tags,
    status: this.status,
    avatar: this.getAvatarURL(),
    website: this.website,
    location: this.location,
    createdAt: this.createdAt
  };
};

// Service auth response (for Wakatime etc.)
UserSchema.methods.toServiceJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    fullName: this.fullName,
    role: this.role,
    tags: this.tags,
    status: this.status,
    canAccess: this.canAccessServices(),
    avatar: this.getAvatarURL(),
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);