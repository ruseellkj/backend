import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String,
      require: true,
      unique: true,
      trim: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      require: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        require: true,
    },
    description: {
        type: String,
        require: true,
        trim : true
    },
    duration:{
        type: Number,
        require: true,
    },
    views:{
        type: Number,
        require: true,
        default: 0
    },
    isPublished:{
        type: Boolean,
        default: true
    },
  },
  { timestamps: true }
);

// Phase-2 : use the mongooseAggregatePaginate
// mongoose meh kaafi types of middleware likh sakte hai and apne plugin bhi (middleware in schema level)
videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema);
