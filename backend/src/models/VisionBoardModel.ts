import { Schema, model } from "mongoose";

const visionBoardItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["image", "quote", "icon"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const visionBoardSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [visionBoardItemSchema],
      required: true,
      default: [],
    },
    goalId: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const VisionBoardModel = model("VisionBoard", visionBoardSchema);
