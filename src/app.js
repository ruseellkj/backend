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
export default app;