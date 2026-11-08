import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IKioskSession extends Document {
  pin: string;
  routineId: Types.ObjectId;
  classId?: string;
  subject: string;
  paperCode?: string;
  department: string;
  academicYear?: string;
  semester: number;
  section: string;
  timeSlot?: string;
  teacherId: Types.ObjectId;
  teacherName: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KioskSessionSchema = new Schema<IKioskSession>(
  {
    pin: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    routineId: {
      type: Schema.Types.ObjectId,
      ref: "Routine",
      required: true,
      index: true,
    },
    classId: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    paperCode: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      default: "1st Year",
    },
    semester: {
      type: Number,
      required: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timeSlot: {
      type: String,
      trim: true,
      default: "",
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index to auto-expire documents
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const KioskSession: Model<IKioskSession> =
  mongoose.models.KioskSession ||
  mongoose.model<IKioskSession>("KioskSession", KioskSessionSchema);

export default KioskSession;

