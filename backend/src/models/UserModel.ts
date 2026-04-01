import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      required: true,
      default: "user",
    },
    onboardingCompletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    avatarUrl: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    locale: {
      type: String,
      required: true,
      default: "vi",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  onboardingCompletedAt: Date | null;
  avatarUrl: string | null;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = model("User", userSchema);
