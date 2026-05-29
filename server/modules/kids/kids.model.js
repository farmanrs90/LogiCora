const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  q:       { type: String, required: true },
  options: [{ type: String }],
  correct: { type: Number, required: true, min: 0 }, // doğru variantın indeksi
}, { _id: false });

const videoSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  titleAz:    { type: String, default: '' },
  videoUrl:   { type: String, required: true },
  thumbnail:  { type: String, default: '' },
  duration:   { type: Number, default: 0 },
  category: {
    type: String,
    required: true,
    enum: ['vegetables','fruits','family','animals','colors','numbers','letters','emotions','habits','safety'],
  },
  ageGroup:   [{ type: String, enum: ['3-5','6-8'] }],
  presenter:  { type: String, enum: ['logi','cora','both'], default: 'both' },
  vocabulary: { type: [String], default: [] },
  questions:  [questionSchema],
  views:      { type: Number, default: 0 },
  likes:      { type: Number, default: 0 },
  isPublished:{ type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('KidsVideo', videoSchema);
