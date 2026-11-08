import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuthorizedStaff extends Document {
  email: string;
  role: string;
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
    collection: "authorizedstaffs",
  }
);

const AuthorizedStaff: Model<IAuthorizedStaff> =
  mongoose.models.AuthorizedStaff ||
  mongoose.model<IAuthorizedStaff>("AuthorizedStaff", AuthorizedStaffSchema, "authorizedstaffs");

export default AuthorizedStaff;
