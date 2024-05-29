import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
    getPublicIdFromUrl,
} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = " ", sortBy = 'createdAt', sortType = 'desc', userId } = req.query
    // TODO: get all videos based on query, sort, pagination
    // algo for getting all the videos listed on a user's page 
    // 1. get the query from the req
    // 2. that is basically when we hit https://www.youtube.com/@rushil_jariwala/videos
    // 3. validate the field
    // 4. join the video and owner fields through aggregate method

    if (!(isValidObjectId(userId))) {
        throw new apiError("userId not found");
    }

    const user = await User.findById({
        _id: userId,
    });

    if (!user) {
        throw new apiError(404, "User not found");
    }

    const options = {
        page,
        limit,
    }

    const aggregateOptions = [
        // stage 1 or pipeline 1
        {
            $match: {
                $and: [
                    {
                        owner: user?._id,
                    },
                    {
                        $text: {
                            $search: query,
                        }
                    }
                ]
            }
        },
        // stage 2 or pipeline 2
        {
            $sort: {
                [sortBy]: sortType === 'desc' ? -1 : 1,
            }
        },
        // stage 3 or pipeline 3
        {
            $skip: (page - 1) * limit,
        },
        //stage 4 or pipeline 4
        {
            $limit: limit,
        },
        // stage 5 or pipeline 5
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                }
            }
        },

    ]

    const videos = await Video.aggregatePaginate(aggregateOptions, options);

    if (!videos) {
        throw new apiError(500, "something want wrong while get all videos");
    }

    return res
        .status(200)
        .json(new apiResponse(200, { videos }, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary , create video
    // algo for publishing video to yt
    // 1. get the details of the video
    // 2. validate the detials 
    // 3. check if the video is already published or not
    // 4. upload the video to cloudinary
    // 5. create the video in the db
    // 6. return the video details to the front-end

    // Validation of all fields
    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required");
    }

    const existingVideo = await Video.findOne({
        title,
        owner: req.user?._id,
    });

    if (existingVideo && existingVideo.isPublished == true) {
        throw new apiError(400, "Video already exists and published");
    }

    // check for the videofile and thumbnail paths
    const videoFileLocalPath = await req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = await req.files?.thumbnail[0]?.path;

    if (!videoFileLocalPath && !thumbnailLocalPath) {
        throw new apiError(400, "Video and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile.url || !thumbnail.url) {
        throw new apiError(400, "Error while uploading the video");
    }

    const video = await Video.create(
        {
            title,
            description,
            videoFile: videoFile?.url,
            thumbnail: thumbnail?.url || "",
            owner: req.user?._id,
        }
    )

    if (!video) {
        throw new apiError(500, "Something went wrong while creating the video doc")
    }

    const createdVideo = await Video.findById(video._id).select(
        "-isPublished"
    );

    if (!createdVideo) {
        throw new apiError(500, "something went wrong while creating the video doc");
    }

    return res
        .status(201)
        .json(new apiResponse(201, { createdVideo }, "Video uploaded Successfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    const video = await Video.aggregate([
        {
            $match: {
                _id: new Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "totalLikes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false,
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                totalLikes: {
                    $size: "$totalLikes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$totalLikes.likedBy"] },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                totalLikes: 0,
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, { video }, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description etc

    const { title, description } = req.body;

    // Check if any field is empty
    if (!isValidObjectId(title) && !isValidObjectId(description)) {
        throw new apiError(400, "All fields are required");
    }

    // check if Invalid videoId
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid videoId!");
    }

    // delete previous thumbnail from cloudinary, if it exists
    const thumbnailLocalPath = req.file?.path;

    const existingVideo = await Video.findOne(
        {
            _id: videoId,
        }
    );

    if (existingVideo) {
        const public_id = getPublicIdFromUrl(existingVideo.thumbnail);

        if (public_id) {
            await deleteFromCloudinary(public_id);
        }
    }

    // upload new thumbnail to the cloudinary if its provided by the user
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
        throw new apiError(500, "Error while uploading thumbnail");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url,
            }
        },
        { new: true });

    if (!updatedVideo) {
        throw new apiError(500, "Something went wrong while updating the video");
    }

    return res
        .status(200)
        .json(new apiResponse(200, { updatedVideo }, "Video updated successfully!"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid videoId!");
    }

    const existingVideo = await Video.findById({
        _id: videoId,
    });

    if (existingVideo) {
        const public_id_tn = getPublicIdFromUrl(existingVideo.thumbnail);
        const public_id_vf = getPublicIdFromUrl(existingVideo.videoFile);

        // if the video exists then delete it from thd cloudinary and then whole videoFile from the db
        if (public_id_vf && public_id_tn) {
            await deleteFromCloudinary(public_id_vf);
            await deleteFromCloudinary(public_id_tn);
        }
    }

    // once the files are deleted then remove the video object from the db
    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new apiError(400, "Error deleting video")
    }

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Video deleted successfully!"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // check if Invalid videoId
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid videoId!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found!");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished:!video.isPublished,
            }
        },
        { new: true }
    );

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Publish status Toggled Successfully"))
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}