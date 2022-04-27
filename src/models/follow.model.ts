import { model, Schema, Document } from "mongoose";
import { Follow } from "@interfaces/follow.interface";

const followSchema: Schema = new Schema({
  postId: { type: String, required: true },
  memberId: { type: String, required: true },
});

const followModel = model<Follow & Document>("Follow", followSchema);

export default followModel;
