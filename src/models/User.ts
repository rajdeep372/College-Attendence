import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole =
  | "Principal"
  | "HOD"
  | "Teacher"
  | "Student"
  | "Principal (Admin)"
  | "Faculty / Teacher"
  | "Head of Dept (HOD)";

export interface IPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt?: Date;
}

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  rollNumber?: string;
  academicYear?: string;
  semester?: number;
  section?: string;
  designation?: string;
  onboarded: boolean;
  profilePicture?: string;
  idCardSoftCopy?: string;
  sessionYear?: string;
  batchDuration?: string;
  pushSubscriptions?: IPushSubscription[];
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
      default: "Student",
      required: true,
      index: true,
      trim: true,
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
    academicYear: {
      type: String,
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      default: "1st Year",
      index: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
      default: 1,
      index: true,
    },
    section: {
      type: String,
      trim: true,
      default: "Section A",
      index: true,
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
    batchDuration: {
      type: String,
      trim: true,
      default: "2024-2028",
    },
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        subscribedAt: { type: Date, default: Date.now },
      },
    ],
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

UserSchema.index({ department: 1, semester: 1, section: 1, role: 1 });
UserSchema.index({ department: 1, academicYear: 1, section: 1 });

// Prevent model overwrite error during Next.js App Router hot reloads
const User: Model<IUser> =
  (mongoose.models && mongoose.models.User) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
