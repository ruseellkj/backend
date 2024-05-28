import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { Video } from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    // algo for creating a new playlist
    // 1. get & check for the details from the front-end
    // 2. get the user as its loggedIn
    // 3. create a new playlist
    // 4. add the playlist to the user's playlists
    // 5. add the playlist to the db

    if (
        [name, description].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "All fields are required");
    }

    // as the user is loggedIn
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new apiError(404, "User not found");
    }

    // create a new playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: user?._id,
    });

    if (!playlist) {
        throw new apiError(404, "Something went wrong creating playlist");
    }

    return res
        .status(201)
        .json(new apiResponse(201, { playlist }, "Playlist successfully created"))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    // algo for getting any user's playlist -> use aggregate function
    // 1. get the details from the frontend 
    // 2. check for the details
    // 3. get the user
    // 4. get the playlists of the user
    // 5. join the video and owner fields through aggregate method
    const { page = 1, limit = 10 } = req.query;

    if (isValidObjectId(userId)) {
        throw new apiError(404, "userId not found");
    }

    // get the user from the db
    const user = await User.findById({
        _id: userId,
    });

    if (!user) {
        throw new apiError(404, "User not found");
    }

    const playlists = await Playlist.aggregate([
        // stage 1 or pipline 1
        {
            $match: {
                owner: new Types.ObjectId(userId),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                        }
                    }
                ]
            },
        },
    ])

    return res
        .status(200)
        .json(new apiResponse(
            200,
            playlists,
            "User playlist successfully fetched"
        ))

});


const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    // check if Invalid playlistId
    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlistId!");
    }

    // check if playlist exist or not
    const isPlaylistExist = await Playlist.findById(playlistId);
    if (!isPlaylistExist) {
        throw new apiError(404, "Playlist not found!");
    }

    const playlist = await Playlist.aggregate([
        // stage 1 or pipline 1
        {
            $match: {
                owner: new Types.ObjectId(playlistId),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ]
            },
        },
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
                    $first: "$owner"
                }
            }
        }
    ])

    return res
        .status(200)
        .json(new apiResponse(200, { playlist }, "Playlist fetched successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: add video to playlist
    // algo for adding a video to playlist
    // 1. get the videoId from the front-end, basically when we hit "https://www.youtube.com/watch?v=_f2kvoRgJ-s"
    // 2. validate the field
    // 3. get the playlist
    // 4. add the video to the playlist
    // 5. add the playlist to the db


    // check if Invalid playlistId or videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlistId or videoId!");
    }

    // check if playlist or video not exist
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError(404, "Playlist not found!");
    }

    const user = req.user?._id;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new apiError(404, "Video not found!");
    }

    const existingVideoInPlaylist = await Playlist.findOne({
        owner: user?._id,
        videos: {
            $elemMatch: {
                $eq: videoId,
            }
        }
    });

    if (existingVideoInPlaylist) {
        throw new apiError(400, "Video already exists in the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                videos: [...playlist.videos, videoId],
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new apiResponse(200, { updatedPlaylist }, "Video added to playlist successfully"));

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    // check if Invalid playlistId or videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlistId or videoId!");
    }

    // check if playlist or video not exist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(404, "Playlist not found!");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found!");
    }

    // remove video from playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new apiError(400, "Something went wrong while remove video to playlist!");
    }

    return res
        .status(200)
        .json(new apiResponse(200, { updatedPlaylist }, "Video removed from playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    // check if Invalid playlistId
    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlistId!");
    }

    // check if playlist exist or not
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(404, "Playlist not found!");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new apiError(500, "Something went wrong while deleting playlist!");
    }

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Playlist deleted successfully"))

});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    // check if Invalid playlistId
    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlistId!");
    }

    // check if any field is empty
    if (!name || !description) {
        throw new apiError(400, "All fields are required!");
    }

    // check if playlist not exist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(404, "Playlist not found!");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {
            $set: {
                name,
                description,
            }
        },
    )

    if (!updatedPlaylist) {
        throw new apiError(500, "Something went wrong while updating playlist!");
    }

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}