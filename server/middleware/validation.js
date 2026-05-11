module.exports = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (!error) {
      return next();
    }

    const details = error.details.map((d) => d.message);
    return res.status(400).json({
      message: 'Validation error',
      details,
    });
  };
};