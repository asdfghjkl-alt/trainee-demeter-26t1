import Joi from "joi";

export const roomSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required().messages({
    "string.base": "Room name must be a string",
    "string.empty": "Room name cannot be empty",
    "string.min": "Room name must be at least 3 characters long",
    "string.max": "Room name must be at most 50 characters long",
    "any.required": "Room name is required",
  }),
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
