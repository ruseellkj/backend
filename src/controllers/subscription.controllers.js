import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "channelId is required");
    }

    // get the channel from the subscription model
    const channel = await Subscription.findById({
        _id: channelId,
    });

    if (!channel) {
        throw new apiError(404, "Channel not found");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new apiError(404, "User not found");
    }

    // check if the channel is subscribed or not
    // steps to check
    // 1. we check if the user is already the subscribed user or not
    const existingSubscription = await Subscription.findOne({
        subscriber: user._id,
        channel: channelId,
    });

    if (!existingSubscription) {
        await Subscription.create({
            subscriber: user._id,
            channel: channelId,
        });
        return res
            .status(200)
            .json(new apiResponse(200, {}, "Channel subscribed successfully"));
    } else {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
            .status(200)
            .json(new apiResponse(200, {}, "Channel unsubscribed successfully"));
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: get subscriber's list of a channel

    // check if Invalid channelId
    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channelId");
    }

    // check if channel not available
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new apiError(404, "Channel not found");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberList",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscriberList: {
                    $first: "$subscriberList",
                },
            },
        },
        {
            $project: {
                subscriberList: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                { subscribers },
                "Subscriber lists fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    // TODO: get subscribed channels

    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "subscriberId is required");
    }

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannelLists",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscribedChannelLists: {
                    $first: "$subscribedChannelLists",
                },
            },
        },
        {
            $project:{
                subscribedChannelLists: 1,
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new apiResponse(200, {subscriptions}, "subscribed ChannelLists fetched successfully")
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
