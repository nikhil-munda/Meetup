import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}
let raisedHands = {} // Track raised hands per room

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
            console.log(`${socket.id} wants to join room: ${path}`);
            
            if (connections[path] === undefined) {
                connections[path] = [];
            }
            if (raisedHands[path] === undefined) {
                raisedHands[path] = [];
            }
            
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            console.log(`Room ${path} now has users:`, connections[path]);

            connections[path].forEach(clientId => {
                io.to(clientId).emit("user-joined", socket.id, connections[path]);
            });

            // Send existing chat messages to new user
            if (messages[path] !== undefined) {
                messages[path].forEach(msg => {
                    io.to(socket.id).emit("chat-message", 
                        msg['data'], 
                        msg['sender'], 
                        msg['socket-id-sender']
                    );
                });
            }

            // Send existing raised hands to new user
            if (raisedHands[path] !== undefined) {
                raisedHands[path].forEach(hand => {
                    io.to(socket.id).emit("hand-raised", hand.socketId, hand.username);
                });
            }
        });

        socket.on("signal", (toId, message) => {
            console.log(`Signal from ${socket.id} to ${toId}`);
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            console.log(`Chat message from ${socket.id} (${sender}): ${data}`);
            
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
                
                console.log("Broadcasting message to room", matchingRoom);

                connections[matchingRoom].forEach((clientId) => {
                    io.to(clientId).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // Hand raise handlers
        socket.on("raise-hand", (username) => {
            console.log(`${username} (${socket.id}) raised their hand`);
            
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ["", false]);

            if (found === true) {
                // Add to raised hands if not already there
                if (!raisedHands[matchingRoom].find(hand => hand.socketId === socket.id)) {
                    raisedHands[matchingRoom].push({ socketId: socket.id, username });
                }

                // Notify all users in the room
                connections[matchingRoom].forEach((clientId) => {
                    io.to(clientId).emit("hand-raised", socket.id, username);
                });
            }
        });

        socket.on("lower-hand", (username) => {
            console.log(`${username} (${socket.id}) lowered their hand`);
            
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ["", false]);

            if (found === true) {
                // Remove from raised hands
                raisedHands[matchingRoom] = raisedHands[matchingRoom].filter(
                    hand => hand.socketId !== socket.id
                );

                // Notify all users in the room
                connections[matchingRoom].forEach((clientId) => {
                    io.to(clientId).emit("hand-lowered", socket.id, username);
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
            
            for (const [roomKey, roomUsers] of Object.entries(connections)) {
                const userIndex = roomUsers.indexOf(socket.id);
                if (userIndex !== -1) {
                    roomUsers.forEach(clientId => {
                        if (clientId !== socket.id) {
                            io.to(clientId).emit("user-left", socket.id);
                        }
                    });

                    roomUsers.splice(userIndex, 1);

                    // Remove from raised hands
                    if (raisedHands[roomKey]) {
                        raisedHands[roomKey] = raisedHands[roomKey].filter(
                            hand => hand.socketId !== socket.id
                        );
                    }

                    if (roomUsers.length === 0) {
                        delete connections[roomKey];
                        delete messages[roomKey];
                        delete raisedHands[roomKey];
                    }

                    console.log(`Removed ${socket.id} from room ${roomKey}`);
                    break;
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
