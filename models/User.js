const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UserUtils = {
  // Method to hash password
  hashPassword: async (password) => {
    if (!password) return null;
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  },

  // Method to compare password
  comparePassword: async (user, candidatePassword) => {
    if (!user.password) return false;
    return bcrypt.compare(candidatePassword, user.password);
  },

  // Method to generate API key
  generateApiKey: () => {
    return `deauth_${uuidv4().replace(/-/g, '')}`;
  },

  // Method to get avatar URL
  getAvatarURL: (user, size = 128) => {
    if (user.discordAvatar && user.discordId) {
      return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png?size=${size}`;
    }
    const defaultAvatar = parseInt(user.discordId || '0') % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png?size=${size}`;
  },

  // Check if user has a specific tag
  hasTag: (user, tag) => {
    return user.tags && user.tags.includes(tag);
  },

  // Check if user is banned
  isBanned: (user) => {
    return user.status === 'banned';
  },

  // Check if user is blacklisted
  isBlacklisted: (user) => {
    return UserUtils.hasTag(user, 'blacklisted');
  },

  // Check if user can access API services
  canAccessServices: (user) => {
    return user.status === 'active' && !UserUtils.hasTag(user, 'blacklisted');
  },

  // Format user for safe public JSON response
  toPublicJSON: (user) => {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.discordUsername,
      bio: user.bio,
      role: user.role,
      tags: user.tags || [],
      status: user.status,
      avatar: UserUtils.getAvatarURL(user),
      website: user.website,
      location: user.location,
      createdAt: user.createdAt
    };
  },

  // Format user for safe service JSON response
  toServiceJSON: (user) => {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName || user.discordUsername,
      role: user.role,
      tags: user.tags || [],
      status: user.status,
      canAccess: UserUtils.canAccessServices(user),
      avatar: UserUtils.getAvatarURL(user),
      createdAt: user.createdAt
    };
  },

  // Helper to attach methods to standard prisma objects easily in templates and existing routes
  attachMethods: (user) => {
    if (!user) return null;
    return {
      ...user,
      _id: user.id, // For backwards compatibility with existing templates/routes looking for _id
      comparePassword: (pwd) => UserUtils.comparePassword(user, pwd),
      generateApiKey: () => UserUtils.generateApiKey(), // Note: caller must still save the key to DB
      getAvatarURL: (size) => UserUtils.getAvatarURL(user, size),
      hasTag: (tag) => UserUtils.hasTag(user, tag),
      isBanned: () => UserUtils.isBanned(user),
      isBlacklisted: () => UserUtils.isBlacklisted(user),
      canAccessServices: () => UserUtils.canAccessServices(user),
      toPublicJSON: () => UserUtils.toPublicJSON(user),
      toServiceJSON: () => UserUtils.toServiceJSON(user)
    };
  },
  
  attachMethodsArray: (users) => {
      if(!users) return [];
      return users.map(user => UserUtils.attachMethods(user));
  }
};

// We export the standard utility functions and the raw prisma client
module.exports = { UserUtils, prisma };