import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAttendance extends Document {
  date: Date;
  timeSlot?: string;
  teacherName: string;
  subject: string;
  academicYear?: string | number;
  department: string;
  semester: number;
  section: string;
  routineId?: Types.ObjectId;
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
    timeSlot: {
      type: String,
      default: "",
      trim: true,
    },
    teacherName: {
      type: String,
      required: [true, "Teacher name is required"],
      trim: true,
      default: "Faculty Member",
    },
    subject: {
      type: String,
      required: [true, "Class / Subject is required"],
      trim: true,
    },
    academicYear: {
      type: Schema.Types.Mixed,
      default: new Date().getFullYear(),
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 12,
      default: 1,
      index: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      default: "Section A",
      index: true,
    },
    routineId: {
      type: Schema.Types.ObjectId,
      ref: "Routine",
      required: false,
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

// Compound index for querying attendance by department, semester, section, and date
AttendanceSchema.index({ department: 1, semester: 1, section: 1, date: -1 });
AttendanceSchema.index({ department: 1, academicYear: 1, semester: 1, section: 1 });

const Attendance: Model<IAttendance> =
  (mongoose.models && mongoose.models.Attendance) ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
