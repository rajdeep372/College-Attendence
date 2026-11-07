import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotificationType = "alert" | "success" | "info" | "circular";

export interface INotification extends Document {
  recipientId?: Types.ObjectId | null;
  targetRole?: "Student" | "Teacher" | "HOD" | "Principal" | "All";
  targetDepartment?: string;
  excludeUserId?: Types.ObjectId | null;
  title: string;
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
      enum: ["Student", "Teacher", "HOD", "Principal", "All"],
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
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["alert", "success", "info", "circular"],
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

// Indexes for fast querying per user and audience
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ targetRole: 1, targetDepartment: 1, createdAt: -1 });

const Notification: Model<INotification> =
  (mongoose.models && mongoose.models.Notification) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;

