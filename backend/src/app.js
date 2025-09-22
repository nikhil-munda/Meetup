import express from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";



const app= express();
const server= createServer(app);
const io= connectToSocket(server);
console.log("Socket.IO server initialized");

app.set("port", (process.env.PORT || 8000))
app.set("mongo_username", (process.env.PORT))
app.use(cors());
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({limit: "40kb", extended: true}))
app.use("/api/v1/users", userRoutes)
// app.use("api/v2/users", newUserRoutes)

const start= async()=>{

    const connectionDB = await mongoose.connect("mongodb+srv://nikhilmunda0001_db_user:04072004@cluster0.p4ewauh.mongodb.net/")
    console.log(`MONGO CONNECTED TO DB HOST: ${connectionDB.connection.host}`);
    
    server.listen(app.get("port"),()=>{
        console.log("LISTENING ON PORT 8000")
    });
}

start();