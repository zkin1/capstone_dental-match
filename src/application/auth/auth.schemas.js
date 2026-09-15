const Joi = require('joi');

const password = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
  .required()
  .messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe incluir mayúscula, minúscula, número y símbolo',
  });

const CreateUserDTO = Joi.object({
  email: Joi.string().email().max(255).required(),
  password,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Las contraseñas no coinciden' }),
  nombre: Joi.string().trim().min(2).max(100).required(),
  apellido: Joi.string().trim().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'coordinator', 'student').default('coordinator'),
  telefono: Joi.string().trim().max(20).allow('', null),
  codigoEstudiante: Joi.when('role', {
    is: 'student',
    then: Joi.string().pattern(/^EST-\d{4}-\d{6}$/).required(),
    otherwise: Joi.forbidden(),
  }),
});

const LoginDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const ChangePasswordDTO = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password,
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({ 'any.only': 'Las contraseñas no coinciden' }),
});

module.exports = { CreateUserDTO, LoginDTO, ChangePasswordDTO };
