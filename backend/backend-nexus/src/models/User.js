const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      default: null, // kosong kalau login via SSO (Google)
    },
    googleId: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profile: {
      fullName: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 75,
        default: 'New User',
      },
      roleTitle: {
        type: String,
        maxlength: 75,
        default: '',
      },
      avatarUrl: {
        type: String,
        default: '',
      },
    },
    onboarding: {
      isCompleted: {
        type: Boolean,
        required: true,
        default: false,
      },
      role: {
        type: String,
        maxlength: 75,
        default: '',
      },
      teamSize: {
        type: String,
        maxlength: 75,
        default: '',
      },
      industry: {
        type: String,
        maxlength: 75,
        default: '',
      },
    },
    storage: {
      usedBytes: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      limitBytes: {
        type: Number,
        required: true,
        default: 4294967296, // 4GB in bytes
      },
    },
    subscription: {
      plan: {
        type: String,
        required: true,
        enum: ['Free', 'Standard', 'Premium'],
        default: 'Free',
      },
      status: {
        type: String,
        required: true,
        enum: ['active', 'expired'],
        default: 'active',
      },
    },
    // Audit Trail: Who
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },

  {
    // Audit Trail: When (Otomatis generate createdAt & updatedAt)
    timestamps: true,
  },
);

// TTL index to hard delete unverified users after 20 minutes (1200 seconds)
userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 1200, partialFilterExpression: { isVerified: false } }
);

module.exports = mongoose.model('User', userSchema);
