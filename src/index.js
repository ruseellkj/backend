import connectDB from "./db/index.js";
// require('dotenv').config({path: './env'});
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB() 
  .then(() => {
    app.on("error", (error) => {
      console.log("ERR: ", error);
      throw error;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is listening on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGODB connection failed", err);
  });
