import Joi from "joi";
import { TRANSPORTATION_MODES } from "@/lib/constants";

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
  location: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Location must be a string",
    "string.empty": "Location is required",
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location must be at most 100 characters",
    "any.required": "Location is required",
  }),
  dietaryRequirements: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .default([]),
  dietaryNotes: Joi.string().trim().max(500).allow("").default("").messages({
    "string.max": "Dietary notes must be at most 500 characters",
  }),
  preferences: Joi.string().trim().max(500).allow("").default("").messages({
    "string.max": "Preferences must be at most 500 characters",
  }),
  transportationMode: Joi.string()
    .valid(...TRANSPORTATION_MODES)
    .required()
    .messages({
      "any.only": `Transportation mode must be one of: ${TRANSPORTATION_MODES.join(", ")}`,
      "any.required": "Please select a transportation mode",
      "string.empty": "Please select a transportation mode",
    }),
  date: Joi.date().iso().allow(null, "").optional().messages({
    "date.format": "Please enter a valid date",
  }),
  meetingDirection: Joi.string().valid("to-venue", "from-venue").default("to-venue").optional(),
  description: Joi.string().trim().max(200).allow(null, "").optional().messages({
    "string.max": "Description must not exceed 200 characters",
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
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  description: Joi.string().trim().allow("").optional(),
  category: Joi.string().trim().allow("").optional(),
});
