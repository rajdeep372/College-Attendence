import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRoutine extends Document {
  department: string;
  academicYear: string;
  semester: number;
  section: string;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  subject: string;
  timeSlot: string;
  teacherId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSchema = new Schema<IRoutine>(
  {
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, "Academic Year is required"],
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      default: "1st Year",
      index: true,
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 12,
      index: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      default: "Section A",
      index: true,
    },
    dayOfWeek: {
      type: String,
      required: [true, "Day of week is required"],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for strict 4-parameter timetable matching
RoutineSchema.index({ department: 1, academicYear: 1, semester: 1, section: 1, dayOfWeek: 1 });
RoutineSchema.index({ department: 1, semester: 1, section: 1, dayOfWeek: 1 });

// Prevent model overwrite error during Next.js App Router hot reloads
const Routine: Model<IRoutine> =
  (mongoose.models && mongoose.models.Routine) ||
  mongoose.model<IRoutine>("Routine", RoutineSchema);

export default Routine;
