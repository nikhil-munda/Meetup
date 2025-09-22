import React, { useState, useRef, useEffect } from 'react';
import { io } from "socket.io-client";
import { Button, TextField, Box } from '@mui/material';
import '../style/VideoComponent.css';

const serverURL = "http://localhost:8000";

var connections = {}

const peerConnectionConfig = {
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}

export default function VideoMeetComponent() {
  var socketRef = useRef()
  let socketIdRef = useRef()
  let localVideoRef = useRef()

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState(true);
  let [audio, setAudio] = useState(true);
  let [screen, setScreen] = useState(false);
  let [showModal, setShowModal] = useState(true);
  let [screenAvailable, setScreenAvailable] = useState(false);
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessage, setNewMessage] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  
  let [videos, setVideos] = useState([]);
  let videoRef = useRef([]);

  // Add room state
  let [roomId, setRoomId] = useState("");

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoPermission) {
        setVideoAvailable(true)
        videoPermission.getTracks().forEach(track => track.stop());
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (audioPermission) {
        setAudioAvailable(true)
        audioPermission.getTracks().forEach(track => track.stop());
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true)
      }
    } catch (err) {
      console.log("Permission error:", err);
    }
  }

  // Move setupPeerConnection outside of connectToSocketServer
  const setupPeerConnection = (socketId) => {
    console.log("=== SETTING UP PEER CONNECTION ===", socketId);

    connections[socketId].onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate to:", socketId);
            socketRef.current.emit("signal", socketId, JSON.stringify({ 'ice': event.candidate }));
        }
    };

    connections[socketId].ontrack = (event) => {
        console.log("=== RECEIVED REMOTE STREAM ===", socketId);
        const [remoteStream] = event.streams;
        console.log("Remote stream tracks:", remoteStream.getTracks().length);

        setVideos(prevVideos => {
            const exists = prevVideos.find(v => v.socketId === socketId);
            if (exists) {
                console.log("Updating existing video for:", socketId);
                return prevVideos.map(v =>
                    v.socketId === socketId ? { ...v, stream: remoteStream } : v
                );
            } else {
                console.log("Adding new video for:", socketId);
                const newVideo = { socketId: socketId, stream: remoteStream };
                const updatedVideos = [...prevVideos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
            }
        });
    };

    connections[socketId].onconnectionstatechange = () => {
        console.log("Connection state changed for", socketId, ":", connections[socketId].connectionState);
    };

    // Add local stream to the peer connection
    if (window.localStream) {
        console.log("Adding local stream to connection:", socketId);
        window.localStream.getTracks().forEach(track => {
            console.log("Adding track:", track.kind);
            connections[socketId].addTrack(track, window.localStream);
        });
    } else {
        console.log("No local stream available for:", socketId);
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(serverURL, { secure: false });

    socketRef.current.on("connect", () => {
        console.log("=== CONNECTED TO SERVER ===");
        socketRef.current.emit("join-call", roomId); // Use roomId instead of fixed room
        socketIdRef.current = socketRef.current.id;
        console.log("My socket ID:", socketIdRef.current);
        console.log("Joining room:", roomId);
    });

    socketRef.current.on("signal", (fromId, message) => {
        console.log("=== RECEIVED SIGNAL ===");
        console.log("From:", fromId, "To:", socketIdRef.current);
        
        var signal = JSON.parse(message);
        
        if (fromId !== socketIdRef.current) {
            // Create connection if it doesn't exist
            if (!connections[fromId]) {
                console.log("Creating connection for signal from:", fromId);
                connections[fromId] = new RTCPeerConnection(peerConnectionConfig);
                setupPeerConnection(fromId);
            }

            if (signal.sdp) {
                console.log("Processing SDP:", signal.sdp.type);
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => {
                        if (signal.sdp.type === "offer") {
                            console.log("Creating answer for:", fromId);
                            return connections[fromId].createAnswer();
                        }
                    })
                    .then((description) => {
                        if (description) {
                            return connections[fromId].setLocalDescription(description);
                        }
                    })
                    .then(() => {
                        if (signal.sdp.type === "offer") {
                            console.log("Sending answer to:", fromId);
                            socketRef.current.emit("signal", fromId, JSON.stringify({
                                'sdp': connections[fromId].localDescription
                            }));
                        }
                    })
                    .catch(console.error);
            }
            if (signal.ice) {
                console.log("Adding ICE candidate from:", fromId);
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
                    .catch(console.error);
            }
        }
    });

    socketRef.current.on("user-joined", (id, clients) => {
        console.log("=== USER JOINED EVENT ===");
        console.log("Joined user:", id);
        console.log("All clients:", clients);
        console.log("My ID:", socketIdRef.current);
        
        clients.forEach((socketListId) => {
            if (socketListId === socketIdRef.current) {
                console.log("Skipping my own ID");
                return;
            }

            if (connections[socketListId]) {
                console.log("Connection already exists for:", socketListId);
                return;
            }

            console.log("Creating new connection for:", socketListId);
            connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
            setupPeerConnection(socketListId);

            // Only the newly joined user creates offers to existing users
            if (id === socketIdRef.current) {
                console.log("I'm the new user, creating offer to:", socketListId);
                setTimeout(() => {
                    connections[socketListId].createOffer()
                        .then((description) => {
                            console.log("Created offer for:", socketListId);
                            return connections[socketListId].setLocalDescription(description);
                        })
                        .then(() => {
                            console.log("Sending offer to:", socketListId);
                            socketRef.current.emit('signal', socketListId, JSON.stringify({
                                sdp: connections[socketListId].localDescription
                            }));
                        })
                        .catch(console.error);
                }, 1000);
            }
        });
    });

    socketRef.current.on("user-left", (id) => {
        console.log("=== USER LEFT ===", id);
        if (connections[id]) {
            connections[id].close();
            delete connections[id];
        }
        setVideos(prevVideos => {
            const filtered = prevVideos.filter(v => v.socketId !== id);
            videoRef.current = filtered;
            return filtered;
        });
    });
  };

  const connect = () => {
    if (username === "" || roomId === "") {
        alert("Please enter both username and room ID");
        return;
    }
    
    console.log("=== STARTING CONNECTION ===");
    console.log("Username:", username);
    setAskForUsername(false);
    
    // Get user media first, then connect to socket
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
        
        // Connect to socket after getting media
        connectToSocketServer();
    })
    .catch(err => {
        console.error("=== MEDIA ERROR ===", err);
        connectToSocketServer();
    });
  };

  useEffect(() => {
    getPermissions();
  }, []);

  return (
    <div className="main">
      {askForUsername ? (
        <div className="lobby">
          <h2>Enter Video Room</h2>
          <TextField
            label="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            variant="outlined"
            fullWidth
            margin="normal"
            placeholder="Enter room name (e.g., meeting-123)"
          />
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            fullWidth
            margin="normal"
          />
          <Button 
            variant="contained" 
            onClick={connect}
            size="large"
            style={{ marginTop: '20px' }}
            disabled={!roomId || !username}
          >
            Join Room
          </Button>
        </div>
      ) : (
        <div className="video-chat-container">
          <div className="video-container">
            <div className="local-video">
              <h3>You ({username})</h3>
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                width="300" 
                height="200"
                style={{ border: '2px solid #007bff', borderRadius: '10px' }}
              ></video>
            </div>
            <div className="remote-videos">
              {videos.length === 0 ? (
                <div className="waiting-message">
                  <h3>Waiting for others to join...</h3>
                </div>
              ) : (
                videos.map((video, index) => (
                  <div key={video.socketId} className="remote-video">
                    <h3>Remote User {index + 1}</h3>
                    <video
                      data-socket={video.socketId}
                      ref={ref => {
                        if (ref && video.stream) {
                          ref.srcObject = video.stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      width="300"
                      height="200"
                      style={{ border: '2px solid #28a745', borderRadius: '10px' }}
                    ></video>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

