import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}

const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("Client connected - Socket ID:", socket.id);

        socket.on("join-call", (path) => {
            console.log(`${socket.id} wants to join path: ${path}`);
            
            if (connections[path] === undefined) {
                connections[path] = [];
            }
            
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            console.log(`Current connections for ${path}:`, connections[path]);

            // Send user-joined event to ALL users in the room (including the new one)
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; a++) {
                    io.to(socket.id).emit("chat-message", 
                        messages[path][a]['data'], 
                        messages[path][a]['sender'], 
                        messages[path][a]['socket-id-sender']
                    );
                }
            }
        });

        socket.on("signal", (toId, message) => {
            console.log(`Signal from ${socket.id} to ${toId}: ${message.substring(0, 100)}...`);
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ["", false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    'sender': sender, 
                    'data': data, 
                    'socket-id-sender': socket.id
                });
                
                console.log("message", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
            
            var diffTime = Math.abs(timeOnline[socket.id] - new Date());
            var key;

            for (const [k, v] of Object.entries(connections)) {
                for (let a = 0; a < v.length; a++) {
                    if (v[a] === socket.id) {
                        key = k;

                        // Notify other users in the room
                        for (let b = 0; b < connections[key].length; b++) {
                            if (connections[key][b] !== socket.id) {
                                io.to(connections[key][b]).emit("user-left", socket.id);
                            }
                        }

                        var index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        if (connections[key].length === 0) {
                            delete connections[key];
                        }
                        break;
                    }
                }
            }

            delete timeOnline[socket.id];
        });
    });

    return io;
}

export default connectToSocket;

// Add this to your frontend connect function to debug:
const connect = () => {
    if (username === "") {
        alert("Please enter a username");
        return;
    }
    
    console.log("=== STARTING CONNECTION ===");
    console.log("Username:", username);
    console.log("Video available:", videoAvailable);
    console.log("Audio available:", audioAvailable);
    
    setAskForUsername(false);
    
    navigator.mediaDevices.getUserMedia({ 
        video: videoAvailable && video, 
        audio: audioAvailable && audio 
    })
    .then((stream) => {
        console.log("=== GOT USER MEDIA ===");
        console.log("Stream tracks:", stream.getTracks().length);
        window.localStream = stream;
        
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log("Set local video stream");
        }
        
        connectToSocketServer();
    })
    .catch(err => {
        console.error("=== MEDIA ERROR ===", err);
        connectToSocketServer();
    });
};
