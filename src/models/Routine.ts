import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRoutine extends Document {
  department: string;
  semester: number;
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
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 12,
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

// Prevent model overwrite error during Next.js App Router hot reloads
const Routine: Model<IRoutine> =
  (mongoose.models && mongoose.models.Routine) ||
  mongoose.model<IRoutine>("Routine", RoutineSchema);

export default Routine;

