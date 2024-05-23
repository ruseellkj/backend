import mongoose from "mongoose";

const likeSchema = new Schema(
	{
		video: { // like on video
			type: mongoose.Schema.Types.ObjectId,
			ref: "Video",
		},
		comment: { // like on comment 
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
		},
		tweet: { // like on the tweet
			type: mongoose.Schema.Types.ObjectId,
			ref: "Tweet",
		},
		likedBy: { // liked by the which user
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
