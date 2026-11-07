import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type LeaveType = "Medical" | "On-Duty" | "Casual" | "Academic Conference";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface ILeave extends Document {
  applicantId: Types.ObjectId;
  applicantRole: "Student" | "Teacher";
  applicantName: string;
  department: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: Types.ObjectId;
  decisionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Applicant ID is required"],
      index: true,
    },
    applicantRole: {
      type: String,
      enum: ["Student", "Teacher"],
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["Medical", "On-Duty", "Casual", "Academic Conference"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Leave reason is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    decisionNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Leave: Model<ILeave> =
  (mongoose.models && mongoose.models.Leave) ||
  mongoose.model<ILeave>("Leave", LeaveSchema);

export default Leave;

