import Joi from "joi";

export const roomSchema = Joi.object({
  categoryIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .max(3)
    .unique()
    .required()
    .messages({
      "array.base": "categoryIds must be an array",
      "array.min": "categoryIds must contain at least 1 category",
      "array.max": "categoryIds must not contain more than 3 categories",
      "array.unique": "categoryIds must not contain duplicate categories",
      "array.includesRequiredUnknowns":
        "categoryIds must contain only valid category IDs",
      "string.base": "All category IDs must be strings",
      "any.required": "categoryIds is required",
    }),
});

export const addLocationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Location name must be a string",
    "string.empty": "Location name cannot be empty",
    "string.min": "Location name must be at least 2 characters long",
    "string.max": "Location name must be at most 100 characters long",
    "any.required": "Location name is required",
  }),
});
