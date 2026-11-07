import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CircularCategory = "Academic" | "Examination" | "Emergency" | "General";
export type CircularAudience = "All" | "Faculty" | "Students" | "HODs";

export interface ICircular extends Document {
  title: string;
  content: string;
  category: CircularCategory;
  targetAudience: CircularAudience;
  postedBy: Types.ObjectId;
  authorName: string;
  authorRole: string;
  department?: string;
  important: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CircularSchema = new Schema<ICircular>(
  {
    title: {
      type: String,
      required: [true, "Circular title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Circular content is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Academic", "Examination", "Emergency", "General"],
      default: "General",
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ["All", "Faculty", "Students", "HODs"],
      default: "All",
      index: true,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      trim: true,
      default: "College Administration",
    },
    important: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Circular: Model<ICircular> =
  (mongoose.models && mongoose.models.Circular) ||
  mongoose.model<ICircular>("Circular", CircularSchema);

export default Circular;

