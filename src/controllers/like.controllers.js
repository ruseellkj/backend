import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.models.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    // algo for liking a video
    // 1. get the details from the front-end
    // 2. get the video from the db
    // 3. check if the video is already liked or not 
    // 4. if already liked then unlike it else like it 

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Video Id not found");
    }

    // get the video on which we have to toogle the like
    const video = await Video.findById({
        _id: videoId,
    });

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const userId = req.user._id;

    // check if the video is liked or not
    // steps to check 
    // 1. We check if the videoId provided by the user is there in the liked model's video id list
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    });

    // if the video is not liked then like it
    if (!existingLike) {
        await Like.create({
            video: videoId,
            likedBy: userId,
        })
        return res
            .status(200)
            .json(new apiResponse(200, {}, "Video liked successfully"));
    }
    else {
        await Like.findByIdAndDelete(existingLike._id);
        return res
            .status(200)
            .json(new apiResponse(200, {}, "Video disliked successfully"));

    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    //algo for toggling like on comment

    if (!commentId) {
        throw new apiError(400, "commentId is required");
    }

    const user = req.user?._id;

    const existingLike = await Like.findOne({
        $and: [
            { likedBy: user },
            { comment: commentId }
        ]
    })

    if (!existingLike) {
        const like = await Like.create({
            likedBy: user,
            comment: commentId,
        })
        if (!like) {
            throw new apiError(500, `something went wrong while toggle like on comment`);
        }
    } else {
        await Like.findByIdAndDelete(existingLike._id)
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, {}, "comment liked successfully")
        )
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    const user = req.user;

    // User unliking a Tweet
    let unlike = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: user._id,
    });

    if (unlike) {
        res
            .status(200)
            .json(new apiResponse(200, { unlike }, "Tweet unliked successfully"));
    } else {
        // User liking a Tweet
        let like = await Like.create({
            tweet: tweetId,
            likedBy: user?._id,
        });

        if (like) {
            res
                .status(200)
                .json(new apiResponse(200, { like }, "Tweet liked successfully"));
        } else {
            throw new apiError(404, "Can't like this Tweet");
        }
    }
}
);

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    // algo for getting all the liked videos 
    // 1. get the user id from the front-end 
    // 2. use mongoDB aggregate pipelines
    const user = req.user?._id;
    const likedVideos = await Like.aggregate([
        // stage 1
        {
            $match:{
                $and:[
                    {
                        video: { $ne: null }
                    },
                    { likedBy: user}
                ]
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    }
                ]
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            }
        },
        {
            $project: {
                video: 1,
            },
        }
    ]);

    if(!likedVideos){
        throw new apiError(404, "No liked videos found");
    }

    return res
       .status(200)
       .json(new apiResponse(200, likedVideos, "Liked videos fetched successfully"));

})


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getLikedTweets,
}