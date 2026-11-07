import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRoutineClass {
  _id?: Types.ObjectId;
  timeSlot: string;
  paperCode?: string;
  subject: string;
  teacherName?: string;
  teacherId?: Types.ObjectId | null;
  isUnclaimed?: boolean;
}

export interface IRoutine extends Document {
  department: string;
  academicYear: string;
  semester: number;
  section: string;
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  classes: IRoutineClass[];
  // Backwards compatibility optional fields
  paperCode?: string;
  subject?: string;
  timeSlot?: string;
  teacherId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineClassSchema = new Schema<IRoutineClass>(
  {
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      trim: true,
    },
    paperCode: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    teacherName: {
      type: String,
      trim: true,
      default: "Faculty Instructor",
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    isUnclaimed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

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
    classes: {
      type: [RoutineClassSchema],
      default: [],
    },
    // Backwards compatibility legacy fields
    paperCode: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      trim: true,
      required: false,
    },
    timeSlot: {
      type: String,
      trim: true,
      required: false,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for strict 4-parameter timetable matching
RoutineSchema.index({ department: 1, academicYear: 1, semester: 1, section: 1, dayOfWeek: 1 });
RoutineSchema.index({ department: 1, semester: 1, section: 1, dayOfWeek: 1 });
RoutineSchema.index({ department: 1, "classes.teacherId": 1 });
RoutineSchema.index({ department: 1, "classes.isUnclaimed": 1 });

// Prevent model overwrite error during Next.js App Router hot reloads
const Routine: Model<IRoutine> =
  (mongoose.models && mongoose.models.Routine) ||
  mongoose.model<IRoutine>("Routine", RoutineSchema);

export default Routine;
