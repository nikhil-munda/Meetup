import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

// Load environment variables
dotenv.config();



const app= express();
const server= createServer(app);
const io= connectToSocket(server);
console.log("Socket.IO server initialized");

app.set("port", (process.env.PORT || 8000))

// Configure CORS for both development and production
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    process.env.FRONTEND_PROD_URL || "https://meetup-frontend-zdrb.onrender.com"
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({limit: "40kb", extended: true}))
app.use("/api/v1/users", userRoutes)
// app.use("api/v2/users", newUserRoutes)

const start= async()=>{

    const connectionDB = await mongoose.connect(process.env.MONGO_URI)
    console.log(`MONGO CONNECTED TO DB HOST: ${connectionDB.connection.host}`);
    
    server.listen(app.get("port"),()=>{
        console.log(`LISTENING ON PORT ${app.get("port")}`)
    });
}

start();