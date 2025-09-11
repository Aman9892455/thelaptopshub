const Joi = require("joi");

const userValidationSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required'
  }),
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Invalid email format',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required'
  }),
  resetPasswordToken: Joi.string().allow(''),
  resetPasswordExpires: Joi.date().allow(null),
  isAdmin: Joi.boolean()
});



module.exports = userValidationSchema;
