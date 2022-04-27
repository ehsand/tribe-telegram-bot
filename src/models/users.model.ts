import { model, Schema, Document } from "mongoose";
import { User } from "@interfaces/users.interface";

const userSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  id: { type: String, required: true },
  email: { type: String, required: true },
  accessToken: { type: String, required: true },
  telegramId: { type: Number, required: true },
});

const userModel = model<User & Document>("User", userSchema);

export default userModel;
