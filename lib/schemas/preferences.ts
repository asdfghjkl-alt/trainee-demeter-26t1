import Joi from "joi";

export const preferencesSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must be at most 80 characters",
    "any.required": "Name is required",
  }),

  useCurrentLocation: Joi.boolean().required(),

  location: Joi.when("useCurrentLocation", {
    is: false,
    then: Joi.string().trim().min(2).max(100).required().messages({
      "string.base": "Location must be a string",
      "string.empty": "Location is required when not using current location",
      "string.min": "Location must be at least 2 characters",
      "string.max": "Location must be at most 100 characters",
      "any.required": "Location is required when not using current location",
    }),
    otherwise: Joi.string().allow("").optional(),
  }),

  dietaryRequirements: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .optional()
    .default([]),

  dietaryNotes: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Dietary notes must be at most 500 characters",
  }),

  preferences: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Preferences must be at most 500 characters",
  }),

  transportationMode: Joi.string()
    .valid("bus", "train", "metro", "driving", "cycling", "walking")
    .required()
    .messages({
      "any.only":
        "Transportation mode must be one of: Bus, Train, Metro, Driving, Cycling, Walking",
      "any.required": "Please select a transportation mode",
      "string.empty": "Please select a transportation mode",
    }),
});
