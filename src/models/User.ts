import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "Principal" | "HOD" | "Teacher" | "Student";

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: [true, "Clerk ID is required"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: {
        values: ["Principal", "HOD", "Teacher", "Student"],
        message: "{VALUE} is not a valid institutional role",
      },
      default: "Student",
      required: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: "Computer Science",
    },
    profilePicture: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite error during Next.js App Router hot reloads
const User: Model<IUser> =
  (mongoose.models && mongoose.models.User) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;

