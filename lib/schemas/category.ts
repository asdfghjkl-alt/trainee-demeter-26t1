import Joi from "joi";

export const categorySchema = Joi.object({
  name: Joi.string().required().messages({
    "string.base": "Category name is required and must be a string",
    "string.empty": "Category name is required and must be a string",
    "any.required": "Category name is required and must be a string",
  }),
});
