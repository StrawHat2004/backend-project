import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile : {
            type:String, // URL to the video file from a third-party service called cloudinary
            required: true,
            trim: true,
        },
        thumbnail : {
            type: String, // URL to the thumbnail image from a third-party service called cloudinary
            required: true,
        },
        title : {
            type: String,
            required: true,
        },
        description : {
            type: String,
            required: true,
        },
        duration : {
            type: Number, // duration in seconds
            required: true,
        },
        views : {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner : {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }

    }, {timestamps: true});

    videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema);