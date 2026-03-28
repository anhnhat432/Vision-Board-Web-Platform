import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      required: true,
      default: "todo",
    },
    scheduledDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export const TaskModel = model("Task", taskSchema);
