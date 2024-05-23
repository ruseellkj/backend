import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; 

const app = express();

// use method is mostly used for middlewares and to config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// this is for the form type and some more settings & config
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser())

// router import
import userRouter from "./routes/user.routes.js";
import tweetRouter from "./routes/tweet.routes.js";

// routes declaration -> always middleware is used here (syntax)
app.use("/api/v1/users", userRouter);
app.use("/api/vi/tweets", tweetRouter);

export default app;