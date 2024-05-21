import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import {
	deleteFromCloudinary,
	uploadOnCloudinary,
	getPublicIdFromUrl,
} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
// import e from "express";

const generateAccessAndRefreshToken = async (userId) => {
	try {
		const user = await User.findById(userId);
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });

		return { accessToken, refreshToken };
	} catch (error) {
		throw new apiError(
			500,
			"Something went wrong while generating refresh and access tokens"
		);
	}
};

const registerUser = asyncHandler(async (req, res) => {
	// get user details from frontend
	// validation - not empty
	// check if user already exists: username, email
	// check for images, check for avatar
	// upload them to cloudinary, avatar
	// create user object - create entry in db
	// remove password and refresh token field from response
	// check for user creation
	// return res

	// these are the steps/algo that we have written and needs to be followed
	const { fullName, username, email, password } = req.body;

	// Validation of all fields
	if (
		[fullName, username, email, password].some((field) => field?.trim() === "")
	) {
		throw new apiError(400, "All fields are required");
	}

	if (!email.includes("@")) {
		throw new apiError(401, "email field must have @");
	}

	// check if the user already exists or not
	const existedUser = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (existedUser) {
		throw new apiError(409, "User with username or email already exists");
	}

	// console.log(req.files);

	// check for the image files
	const avatarLocalPath = req.files?.avatar[0]?.path;
	const coverImageLocalPath = req.files?.coverImage[0]?.path;

	if (!avatarLocalPath) {
		throw new apiError(400, "Avatar file is required");
	}

	const avatar = await uploadOnCloudinary(avatarLocalPath);
	const coverImage = await uploadOnCloudinary(coverImageLocalPath);

	if (!avatar) {
		throw new apiError(400, "Avatar file is required");
	}

	// console.log(avatar);
	// console.log(avatar.url);
	// console.log(avatar.public_id);

	// create user object
	const user = await User.create({
		fullName,
		avatar: avatar.url,
		coverImage: coverImage?.url || "",
		email,
		password,
		username: username.toLowerCase(),
	});

	const createdUser = await User.findById(user._id).select(
		"-password -refreshToken"
	);

	if (!createdUser) {
		throw new apiError(500, "something went wrong while registering the user");
	}

	return res
		.status(201)
		.json(new apiResponse(200, createdUser, "User registred Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
	// write the algo for the logining for the user
	// get the details from the user
	// check the username or email is valid or not
	// check if the user exists either by username or email
	// check the password
	// generate the access and refresh token
	// send the cookie
	// send the response to the user or the validation message

	const { email, username, password } = req.body;

	if (!(username || email)) {
		throw new apiError(400, "username or email is required");
	}

	// Validation of the fields
	if ([username, email, password].some((field) => field?.trim() === "")) {
		throw new apiError(404, "Fields can't be empty");
	}

	// check if the user exists or not
	const user = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (!user) {
		throw new apiError(404, "user doesnt exist");
	}

	// check password
	const isPasswordValid = await user.isPasswordCorrect(password);

	if (!isPasswordValid) {
		throw new apiError(404, "invalid user credentials");
	}

	// generating access and refresh tokens -> function
	const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
		user._id
	);

	const loggedInUser = await User.findById(user._id).select(
		"-password -refreshToken"
	);

	const options = {
		httpOnly: true,
		secure: true,
	};

	return res
		.status(200)
		.cookie("accessToken", accessToken, options)
		.cookie("refreshToken", refreshToken, options)
		.json(
			new apiResponse(
				200,
				{
					user: loggedInUser,
					accessToken,
					refreshToken,
				},
				"User logged In Successfully"
			)
		);
});

const logoutUser = asyncHandler(async (req, res) => {
	// now here we dont have any thing by which can get access to the user
	// we will make our own middleware to get the user details and also for Auth then we can //logout for that user
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$unset: {
				refreshToken: 1, // this removes the field from document
			},
		},
		{
			new: true,
		}
	);

	const options = {
		httpOnly: true,
		secure: true,
	};

	return res
		.status(200)
		.clearCookie("accessToken", options)
		.clearCookie("refreshToken", options)
		.json(new apiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
	// to refresh the access token we need to send the refresh token from the user to the server
	// now check/match the refresh token
	// if matched then refresh the access token  -> send again or a new one

	const incomingRefreshToken =
		req.cookies.refreshToken || req.body.refreshToken;

	if (!incomingRefreshToken) {
		throw new apiError(404, "Unauthorized access");
	}

	// now check/match the refresh token
	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);

		const user = await User.findById(decodedToken?._id);

		if (!user) {
			throw new apiError(401, "Invalid refresh token");
		}

		if (incomingRefreshToken !== user?.refreshToken) {
			throw new apiError(401, "Refresh token is expired or used");
		}

		const options = {
			httpOnly: true,
			secure: true,
		};

		const { accessToken, newRefreshToken } =
			await generateAccessAndRefreshToken(user._id);

		return res
			.status(200)
			.cookie("accessToken", accessToken, options)
			.cookie("refreshToken", newRefreshToken, options)
			.json(
				new apiResponse(
					200,
					{ accessToken, refreshToken: newRefreshToken },
					"Access token refreshed"
				)
			);
	} catch (error) {
		throw new apiError(401, error?.message || "Invalid refresh token");
	}
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
	// write the algo for changing the current password to a new one
	// 1. get the details from the user
	// 2. if u have fields like new password and confirm new password then add a check
	// 3. change in the db as well

	const { oldPassword, newPassword } = req.body;

	const user = await User.findById(req.user?._id); // agar user loggedin hai then user find karo

	// while changing password check the oldpsswd is correct or not
	const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

	if (!isPasswordCorrect) {
		throw new apiError(400, "Password is incorrect");
	}

	user.password = newPassword; // isse bas set hota hai save nai
	await user.save({ validateBeforeSave: false });

	return res
		.status(200)
		.json(200, {}, "Password has been successfully changed");
});

const getCurrentUser = asyncHandler(async (req, res) => {
	// details for the current user if its loggedIn

	return res
		.status(200)
		.json(new apiResponse(200, req.user, "User data fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
	const { fullName, email } = req.body;

	if (!fullName || !email) {
		throw new apiError(400, "All fields are required");
	}

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				fullName,
				email: email,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(new apiResponse(200, user, "Account details updated successfully"));
});

// now when updating file pls make another file so it becomes easy and reduce network traffic
const updateAvatar = asyncHandler(async (req, res) => {
	const avatarLocalPath = req.file?.path;

	if (!avatarLocalPath) {
		throw new apiError(400, "Avatar file is missing");
	}

	// before uploading a new avatar image to cloudinary first delete the old one
	const existingUser = await User.findById(req.user?._id);

	if (existingUser) {
		const publicId = getPublicIdFromUrl(existingUser.avatar);

		if (publicId) {
			// Use publicId to delete the previous avatar from Cloudinary
			await deleteFromCloudinary(publicId);
		}
	}

	// now we can upload a new avatar image
	const avatar = await uploadOnCloudinary(avatarLocalPath);

	if (!avatar.url) {
		throw new apiError(400, "Error while uploading the avatar");
	}

	// console.log(avatar.url);

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				avatar: avatar.url,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(new apiResponse(200, user, "Avatar image updated successfully"));
});


const getUserChannelProfile = asyncHandler(async (req, res) => {
	// algo for getting the user profile
	// that is basically when we hit www.youtube.com/rushiljariwala
	// now the task is to retrieve the whole user profile
	const { username } = req.params;

	if (!username?.trim()) {
		throw new apiError(400, "Username not found");
	}

	const channel = await User.aggregate([
		// stage 1 or pipeline 1
		{
			$match: {
				username: username?.toLowerCase(),
			},
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "channel",
				as: "subscribers",
			},
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "subscriber",
				as: "subscribedTo",
			},
		},
		{
			$addFields: {
				subscribersCount: {
					$size: "$subscribers",
				},
				channelsSubscribedToCount: {
					$size: "$subscribedTo",
				},
				isSubscribed: {
					$cond: {
						if: { $in: [req.user?._id, "$subscribers.subscriber"] },
						then: true,
						else: false,
					},
				},
			},
		},
		{
			$project: {
				fullName: 1,
				username: 1,
				subscribersCount: 1,
				channelsSubscribedToCount: 1,
				isSubscribed: 1,
				avatar: 1,
				coverImage: 1,
				email: 1,
			},
		},
	]);

	if (!channel?.length) {
		throw new apiError(404, "Channel does not exits");
	}

	return res
		.status(200)
		.json(
			new apiResponse(200, channel[0], "User channel fetched successfully")
		);
});

const getWatchHistory = asyncHandler(async (req, res) => {
	const user = await User.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(req.user._id),
			},
		},
		{
			$lookup: {
				from: "videos",
				localField: "watchHistory",
				foreignField: "_id",
				as: "watchHistory",
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
				],
			},
		},
	]);

	return res
		.status(200)
		.json(
			new apiResponse(
				200,
				user[0].watchHistory,
				"Watch history fetched successfully"
			)
		);
});

export {
	registerUser,
	loginUser,
	logoutUser,
	refreshAccessToken,
	changeCurrentPassword,
	getCurrentUser,
	updateAccountDetails,
	updateAvatar,
	getUserChannelProfile,
	getWatchHistory,
};

// NOTE TO SELF:
// 1. It depends on us( backend engineer ) what to allow and what not to for the user
