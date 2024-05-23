import mongoose, { Types, isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    // algo for getting all the comments for a specific video
    // 1. get the videoId from the front-end, basically when we hit "https://www.youtube.com/watch?v=_f2kvoRgJ-s"
    // 2. validate the field
    // 3. join the video and owner fields through aggregate method
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Video Id is invalid");
    }

    const video = await Video.findById({
        _id: videoId,
    });

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const aggregateOptions = [
        // stage 1 or pipeline 1
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        //stage 2
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
            },
        },
        // stage 3
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        // stage 4
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
                owner: {
                    $first: "$owner",
                },
            },
        },
    ];

    const options = {
        page,
        limit,
    };

    const comment = await Comment.aggregatePaginate(aggregateOptions, options);

    if (!comment) {
        throw new apiError(500, "something went wrong while get all comments");
    }

    return res
        .status(200)
        .json(new apiResponse(200, comment, "All comments successfully fetched"));
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // algo for adding a comment
    // 1. get the videoId from the front-end, basically when we hit "https://www.youtube.com/watch?v=_f2kvoRgJ-s"
    // 2. validate the field
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new apiError(404, "Video Id is invalid");
    }

    if (!content?.trim().length == 0) {
        throw new apiError(404, "Content is empty");
    }

    // find the video in the db
    const video = await Video.findById({
        _id: videoId,
    });

    if (!video) {
        throw new apiError(404, "Video not found");
    }

    // find the user in the db
    const user = await User.findById({
        _id: req.user?._id,
    });

    if (!user?.trim()) {
        throw new apiError(404, "User not found");
    }

    // create the comment object
    const comment = await Comment.create({
        content,
        owner: user?._id,
        video: video?._id,
    });

    const createdComment = await Comment.find(comment._id);

    if (!createdComment) {
        throw new apiError(500, "something went wrong while creating comment");
    }

    return res
        .status(201)
        .json(new apiResponse(201, createdComment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    // algo for updating a comment
    // 1. get the videoId from the front-end, basically when we hit "https://www.youtube.com/watch?v=_f2kvoRgJ-s"
    // 2. validate the field
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new apiError(404, "Video Id is invalid");
    }

    if (!content?.trim().length == 0) {
        throw new apiError(404, "Content is empty");
    }

    // find the user in the db
    const user = await User.findById({
        _id: req.user?._id,
    });

    if (!user?.trim()) {
        throw new apiError(404, "User not found");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new apiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    // algo for deleting a comment
    // 1. get the videoId from the front-end, basically when we hit "https://www.youtube.com/watch?v=_f2kvoRgJ-s"
    // 2. validate the field
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new apiError(404, "Video Id is invalid");
    }

    const comment = await Comment.findById({
        _id: commentId,
    });

    if (!comment) {
        throw new apiError(404, "Comment not found");
    }
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new apiError(500, "something went wrong while deleting comment");
    }

    return res
       .status(200)
       .json(new apiResponse(200, deletedComment, "Comment deleted successfully"));

});

export { getVideoComments, addComment, updateComment, deleteComment };
