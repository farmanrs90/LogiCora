const Joi = require('joi');

const createSessionSchema = Joi.object({
  groupId: Joi.string().hex().length(24).required(),
  date: Joi.date().required(),
});

const markAttendanceSchema = Joi.object({
  records: Joi.array()
    .items(
      Joi.object({
        studentId: Joi.string().hex().length(24).required(),
        status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
        note: Joi.string().allow('').optional(),
      })
    )
    .min(1)
    .required(),
});

module.exports = { createSessionSchema, markAttendanceSchema };
