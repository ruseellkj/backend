import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { apiError } from "./apiError.js";
import { apiResponse } from "./apiResponse.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded to the cloudinary
    // console.log("File has been successfully uploaded", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) {
      throw new apiError(400, "public id not found");
    }

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== "ok") {
      throw new apiError(401, "Error deleting the file from Cloudinary");
    }
  } catch (error) {
    console.error(error);
    throw new apiError(500, "Internal Server Error");
  }
};

const getPublicIdFromUrl = (cloudinaryUrl) => {
  try {
    const result = cloudinary.url(cloudinaryUrl, { type: "upload" });
    return result.public_id || null;
  } catch (error) {
    console.error("Error extracting public_id from Cloudinary URL:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl};
