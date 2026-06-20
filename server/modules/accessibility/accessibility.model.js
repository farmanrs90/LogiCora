const mongoose = require('mongoose');

const accessibilitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fontSize: {
      type: String,
      enum: ['sm', 'md', 'lg', 'xl'],
      default: 'md',
    },
    highContrast: {
      type: Boolean,
      default: false,
    },
    audioQuestions: {
      type: Boolean,
      default: false,
    },
    simplifiedUI: {
      type: Boolean,
      default: false,
    },
    noAnimations: {
      type: Boolean,
      default: false,
    },
    largeClickTargets: {
      type: Boolean,
      default: false,
    },
    keyboardOnly: {
      type: Boolean,
      default: false,
    },
    // Valideynin uşaq üçün seçdiyi xüsusi dəstək növləri (AZ etiketlər) — real multi-select saxlanır.
    // Additiv sahə: köhnə sənədlər üçün default [] (geri-uyğun).
    specialNeedsTypes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

const SPECIAL_NEEDS_DEFAULTS = {
  visual: {
    fontSize: 'xl',
    highContrast: true,
    audioQuestions: true,
    simplifiedUI: false,
    noAnimations: false,
    largeClickTargets: true,
    keyboardOnly: false,
  },
  hearing: {
    fontSize: 'md',
    highContrast: false,
    audioQuestions: false,
    simplifiedUI: true,
    noAnimations: false,
    largeClickTargets: false,
    keyboardOnly: false,
  },
  motor: {
    fontSize: 'lg',
    highContrast: false,
    audioQuestions: false,
    simplifiedUI: true,
    noAnimations: true,
    largeClickTargets: true,
    keyboardOnly: true,
  },
  cognitive: {
    fontSize: 'lg',
    highContrast: false,
    audioQuestions: true,
    simplifiedUI: true,
    noAnimations: true,
    largeClickTargets: true,
    keyboardOnly: false,
  },
};

const AccessibilityConfig = mongoose.model('AccessibilityConfig', accessibilitySchema);

module.exports = { AccessibilityConfig, SPECIAL_NEEDS_DEFAULTS };
