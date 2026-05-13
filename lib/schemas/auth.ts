import Joi from "joi";

export const registerSchema = Joi.object({
  fname: Joi.string().required().messages({
    "string.empty": "First name cannot be blank",
    "any.required": "First name is required",
  }),
  lname: Joi.string().required().messages({
    "string.empty": "Last name cannot be blank",
    "any.required": "Last name is required",
  }),
  phone: Joi.string()
    .pattern(/^04\d{8}$/)
    .required()
    .messages({
      "string.empty": "Mobile number cannot be blank",
      "string.pattern.base":
        "Please enter a valid Australian mobile number starting with 04 (10 digits)",
      "any.required": "Mobile number is required",
    }),
  email: Joi.string()
    .required()
    .email({ tlds: { allow: false } })
    .messages({
      "string.empty": "Email cannot be blank",
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Password cannot be blank",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
    "any.required": "Confirm Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});
