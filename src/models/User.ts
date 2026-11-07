import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "Principal" | "HOD" | "Teacher" | "Student";

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  rollNumber?: string;
  semester?: number;
  section?: string;
  designation?: string;
  onboarded: boolean;
  profilePicture?: string;
  idCardSoftCopy?: string;
  sessionYear?: string;
  archivedSessions?: Array<{
    semester: number;
    sessionYear: string;
    attendancePercentage: number;
    archivedAt: Date;
  }>;
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
      default: "General Academic & Sciences",
      index: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
    },
    section: {
      type: String,
      trim: true,
      default: "A",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    onboarded: {
      type: Boolean,
      default: false,
      index: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    idCardSoftCopy: {
      type: String,
      default: "",
    },
    sessionYear: {
      type: String,
      default: "2024-2025",
    },
    archivedSessions: [
      {
        semester: Number,
        sessionYear: String,
        attendancePercentage: Number,
        archivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
