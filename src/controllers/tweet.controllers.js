import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // TODO: create tweet
    // Get the tweet details from the frontend 
    // validate it 
    // get the user from the db
    const { content, owner } = req.body;

    // validation of the fields
    if(!content){
        throw new apiError(401, "Description not found");
    }

    // find the user 
    const user = await User.findById(req.user?._id) // agar user loggedIn then only we can tweet

    // console.log(user);

    // create the tweet object
    const tweet = await Tweet.create({
        content,
        owner: user?._id
    })

    if(!tweet){
        throw new apiError(400, "Something went wrong");
    }

    const createdTweet = await Tweet.findById(tweet._id);

	if (!createdTweet) {
		throw new apiError(400, "something went wrong while creating a Tweet");
	}

    return res
    .status(201)
    .json(new apiResponse(201, createdTweet, "Tweet created successfully"));
    
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    // details for the any users tweet if the current user is loggedIn
    // that is if we go to x.com/rushil_jariwala

    const { userId } = req.params;

    if(!userId?.trim()){
        throw new apiError(401, "Username not found");
    }

    // find the user in the db
    const user = await User.findById({
        _id : userId,
    });

    if(!user){
        throw new apiError(401, "User not found");
    }

    // const tweet = await Tweet.findById(user._id);
    // or
    const tweet = await Tweet.find({
        owner : user?._id,
    });

    return res
    .status(200)
    .json(new apiResponse(200, tweet, "User tweet successfully fetched"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    // get the id from the params
    const { tweetId } = req.params;

    if(!tweetId?.trim()){
        throw new apiError(404, "Tweet Id not found");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: req.body.content,
                owner,
            }
        },
        { new: true }
    );

    return res
    .status(201)
    .json(new apiResponse(201, updatedTweet, "Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    // get the id from the params
    const { tweetId } = req.params;

    if(!tweetId?.trim()){
        throw new apiError(404, "Tweet Id not found");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
        throw new apiError(404, "Tweet not found");
    }

    return res
    .status(201)
    .json(new apiResponse(201, deleteTweet, "Tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}