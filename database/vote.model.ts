import mongoose, { models } from "mongoose";

export interface IVote {
  _id: string;
  roomCode: string; // which room this vote belongs to
  participantId: string; // who voted
  rankings: string[]; // ordered list of location IDs
  createdAt: Date;
  updatedAt: Date;
}

const voteSchema = new mongoose.Schema<IVote>(
  {
    roomCode: { type: String, required: true, index: true },
    participantId: { type: String, required: true, index: true },
    rankings: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          // ensures no duplicate locations in ranking
          return Array.isArray(v) && new Set(v).size === v.length;
        },
        message: "Rankings must not contain duplicate location IDs",
      },
    },
  },
  {
    timestamps: true, // automatically adds createdAt + updatedAt
  }
);

const Vote = models.Vote || mongoose.model<IVote>("Vote", voteSchema);

export default Vote;