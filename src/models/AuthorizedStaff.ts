import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuthorizedStaff extends Document {
  email: string;
  role: "Teacher" | "HOD" | "Principal";
  name?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorizedStaffSchema = new Schema<IAuthorizedStaff>(
  {
    email: {
      type: String,
      required: [true, "Authorized staff email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, "Authorized staff role is required"],
      enum: {
        values: ["Teacher", "HOD", "Principal"],
        message: "{VALUE} is not a valid staff role",
      },
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const AuthorizedStaff: Model<IAuthorizedStaff> =
  mongoose.models.AuthorizedStaff ||
  mongoose.model<IAuthorizedStaff>("AuthorizedStaff", AuthorizedStaffSchema);

export default AuthorizedStaff;

