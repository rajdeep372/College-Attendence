import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotificationType =
  | "alert"
  | "success"
  | "info"
  | "circular"
  | "LEAVE_APPLICATION"
  | string;

export interface INotification extends Document {
  recipientId?: Types.ObjectId | null;
  targetRole?: "Student" | "Teacher" | "HOD" | "Principal" | "Principal (Admin)" | "Faculty / Teacher" | "Head of Dept (HOD)" | "All" | string;
  targetRoles?: string[];
  targetDepartment?: string;
  excludeUserId?: Types.ObjectId | null;
  title?: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  readBy: Types.ObjectId[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetRole: {
      type: String,
      default: undefined,
      index: true,
    },
    targetRoles: {
      type: [String],
      default: undefined,
      index: true,
    },
    targetDepartment: {
      type: String,
      trim: true,
      default: undefined,
      index: true,
    },
    excludeUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: "New Notification",
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      default: "info",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying per user, audience, and role-based targets
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ targetRole: 1, targetDepartment: 1, createdAt: -1 });
NotificationSchema.index({ targetRoles: 1, targetDepartment: 1, createdAt: -1 });

const Notification: Model<INotification> =
  (mongoose.models && mongoose.models.Notification) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
