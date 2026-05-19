import Joi from "joi";
import { TRANSPORTATION_MODES } from "@/database";

export const joinRoomSchema = Joi.object({
  // Optional + allow empty in the schema; the handler enforces the
  // guest-name rule with a friendlier message ("Name is required for guest users").
  name: Joi.string().trim().min(2).max(80).allow("").optional().messages({
    "string.base": "Name must be a string",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must be at most 80 characters",
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
});
