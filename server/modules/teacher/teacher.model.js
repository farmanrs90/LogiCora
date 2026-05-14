const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        specialization: {
            type: String,
            enum: ['mathematics', 'language', 'science', 'history', 'physical_education', 'art', 'music', 'other'],
            required: true,
        },
        qualifications: [
            {
                degree: String,
                institution: String,
                year: Number,
            },
        ],
        experience: {
            type: Number,
            default: 0,
        },
        bio: {
            type: String,
            default: '',
        },
        groups: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Group',
            },
        ],
        isVerified: {
            type: Boolean,
            default: false,
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        totalStudents: {
            type: Number,
            default: 0,
        },
        canPublish: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Teacher', teacherSchema);
