import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAttendance extends Document {
  date: Date;
  routineId: Types.ObjectId;
  presentStudents: Types.ObjectId[];
  absentStudents: Types.ObjectId[];
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
      default: Date.now,
      index: true,
    },
    routineId: {
      type: Schema.Types.ObjectId,
      ref: "Routine",
      required: [true, "Routine reference is required"],
      index: true,
    },
    presentStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    absentStudents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marking teacher ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying attendance by date and routine
AttendanceSchema.index({ routineId: 1, date: 1 });

// Prevent model overwrite error during Next.js App Router hot reloads
const Attendance: Model<IAttendance> =
  (mongoose.models && mongoose.models.Attendance) ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;

