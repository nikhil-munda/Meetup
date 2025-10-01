import React, { useState, useRef, useEffect } from 'react';
import { io } from "socket.io-client";
import { Button, TextField, IconButton, Typography, Snackbar, Alert, Avatar, Chip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import PanToolIcon from '@mui/icons-material/PanTool';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import PeopleIcon from '@mui/icons-material/People';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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
  let chatMessagesRef = useRef()
  let isConnecting = useRef(false)

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [screenAvailable, setScreenAvailable] = useState(false);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  let [roomId, setRoomId] = useState("");
  let [videos, setVideos] = useState([]);

  // Media control states
  let [audioEnabled, setAudioEnabled] = useState(true);
  let [videoEnabled, setVideoEnabled] = useState(true);
  let [screenSharing, setScreenSharing] = useState(false);

  // Chat states
  let [showChat, setShowChat] = useState(false);
  let [chatMessage, setChatMessage] = useState("");
  let [chatMessages, setChatMessages] = useState([]);
  let [unreadMessages, setUnreadMessages] = useState(0);

  // Hand raise states
  let [handRaised, setHandRaised] = useState(false);
  let [raisedHands, setRaisedHands] = useState([]);
  let [handRaiseNotification, setHandRaiseNotification] = useState(null);
  let [showNotification, setShowNotification] = useState(false);

  // UI states
  let [isFullscreen, setIsFullscreen] = useState(false);
  let [showParticipants, setShowParticipants] = useState(false);
  let [showScrollTop, setShowScrollTop] = useState(false);

  // Voice detection states
  let [voiceLevel, setVoiceLevel] = useState(0);
  let [voiceCheckPassed, setVoiceCheckPassed] = useState(false);
  let [isTestingVoice, setIsTestingVoice] = useState(false);
  let audioContextRef = useRef(null);
  let analyserRef = useRef(null);
  let microphoneRef = useRef(null);
  let meetingContainerRef = useRef(null);

  const getPermissions = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoAvailable(true);
      videoStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log("Video not available:", err);
      setVideoAvailable(false);
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioAvailable(true);
      audioStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log("Audio not available:", err);
      setAudioAvailable(false);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      setScreenAvailable(true);
    } else {
      setScreenAvailable(false);
    }
  }

  const startVoiceTest = async () => {
    if (!audioAvailable) {
      alert("Microphone not available. Please check your permissions.");
      return;
    }

    setIsTestingVoice(true);
    setVoiceCheckPassed(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });

      // Store the stream for cleanup
      window.voiceTestStream = stream;

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      microphoneRef.current.connect(analyserRef.current);

      const detectVoice = () => {
        if (!analyserRef.current || !isTestingVoice) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(100, (average / 255) * 100);
        
        setVoiceLevel(normalizedLevel);

        // If voice level is consistently above threshold, mark as passed
        if (normalizedLevel > 10) {
          setVoiceCheckPassed(true);
        }

        if (isTestingVoice) {
          requestAnimationFrame(detectVoice);
        }
      };

      detectVoice();

      // Auto stop voice test after 10 seconds
      setTimeout(() => {
        if (isTestingVoice) {
          stopVoiceTest();
        }
      }, 10000);

    } catch (err) {
      console.error("Error starting voice test:", err);
      alert("Could not access microphone for voice test. Please check permissions.");
      setIsTestingVoice(false);
    }
  };

  const stopVoiceTest = () => {
    setIsTestingVoice(false);
    setVoiceLevel(0);

    // Stop the microphone stream
    if (window.voiceTestStream) {
      window.voiceTestStream.getTracks().forEach(track => track.stop());
      window.voiceTestStream = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    microphoneRef.current = null;
  };

  const setupPeerConnection = (socketId) => {
    console.log("Setting up peer connection for:", socketId);

    connections[socketId].onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", socketId);
        socketRef.current.emit("signal", socketId, JSON.stringify({ 
          ice: event.candidate 
        }));
      }
    };

    connections[socketId].ontrack = (event) => {
      console.log("Received remote stream from:", socketId);
      const [remoteStream] = event.streams;

      setVideos(prevVideos => {
        const exists = prevVideos.find(v => v.socketId === socketId);
        if (exists) {
          return prevVideos.map(v =>
            v.socketId === socketId ? { ...v, stream: remoteStream } : v
          );
        } else {
          return [...prevVideos, { socketId: socketId, stream: remoteStream }];
        }
      });
    };

    connections[socketId].onconnectionstatechange = () => {
      console.log("Connection state for", socketId, ":", connections[socketId].connectionState);
      
      if (connections[socketId].connectionState === 'failed' || 
          connections[socketId].connectionState === 'closed') {
        console.log("Cleaning up failed connection for:", socketId);
        delete connections[socketId];
        setVideos(prev => prev.filter(v => v.socketId !== socketId));
      }
    };

    if (window.localStream) {
      window.localStream.getTracks().forEach(track => {
        connections[socketId].addTrack(track, window.localStream);
      });
    }
  };

  const connectToSocketServer = () => {
    if (isConnecting.current || socketRef.current?.connected) {
      console.log("Already connecting or connected, skipping...");
      return;
    }

    isConnecting.current = true;
    socketRef.current = io.connect(serverURL, {
      forceNew: true,
      transports: ['websocket'],
      timeout: 20000
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to server, socket ID:", socketRef.current.id);
      socketIdRef.current = socketRef.current.id;
      isConnecting.current = false;
      connections = {};
      socketRef.current.emit("join-call", roomId);
    });

    socketRef.current.on("user-joined", (id, clients) => {
      console.log("User joined:", id, "All clients:", clients);
      
      clients.forEach((clientId) => {
        if (clientId === socketIdRef.current || connections[clientId]) {
          return;
        }

        connections[clientId] = new RTCPeerConnection(peerConnectionConfig);
        setupPeerConnection(clientId);

        if (id === socketIdRef.current) {
          setTimeout(() => {
            if (connections[clientId] && connections[clientId].connectionState !== 'closed') {
              connections[clientId].createOffer()
                .then(description => {
                  return connections[clientId].setLocalDescription(description);
                })
                .then(() => {
                  socketRef.current.emit("signal", clientId, JSON.stringify({
                    sdp: connections[clientId].localDescription
                  }));
                })
                .catch(console.error);
            }
          }, 1000);
        }
      });
    });

    socketRef.current.on("signal", (fromId, message) => {
      if (fromId === socketIdRef.current) return;

      const signal = JSON.parse(message);

      if (!connections[fromId]) {
        connections[fromId] = new RTCPeerConnection(peerConnectionConfig);
        setupPeerConnection(fromId);
      }

      if (signal.sdp) {
        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              return connections[fromId].createAnswer();
            }
          })
          .then((answer) => {
            if (answer) {
              return connections[fromId].setLocalDescription(answer);
            }
          })
          .then(() => {
            if (signal.sdp.type === "offer") {
              socketRef.current.emit("signal", fromId, JSON.stringify({
                sdp: connections[fromId].localDescription
              }));
            }
          })
          .catch(console.error);
      }

      if (signal.ice) {
        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch(console.error);
      }
    });

    socketRef.current.on("user-left", (id) => {
      if (connections[id]) {
        connections[id].close();
        delete connections[id];
      }
      setVideos(prev => prev.filter(v => v.socketId !== id));
      setRaisedHands(prev => prev.filter(hand => hand.socketId !== id));
    });

    socketRef.current.on("chat-message", (data, sender, socketIdSender) => {
      const messageData = {
        sender: sender,
        message: data,
        timestamp: new Date().toLocaleTimeString(),
        socketId: socketIdSender
      };

      setChatMessages(prev => [...prev, messageData]);
      
      if (!showChat && socketIdSender !== socketIdRef.current) {
        setUnreadMessages(prev => prev + 1);
      }

      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
    });

    socketRef.current.on("hand-raised", (socketId, username) => {
      setRaisedHands(prev => {
        if (prev.find(hand => hand.socketId === socketId)) {
          return prev;
        }
        return [...prev, { socketId, username }];
      });

      if (socketId !== socketIdRef.current) {
        setHandRaiseNotification(`${username} raised their hand 🙋`);
        setShowNotification(true);
      }
    });

    socketRef.current.on("hand-lowered", (socketId, username) => {
      setRaisedHands(prev => prev.filter(hand => hand.socketId !== socketId));

      if (socketId !== socketIdRef.current) {
        setHandRaiseNotification(`${username} lowered their hand`);
        setShowNotification(true);
      }
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
      isConnecting.current = false;
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
      isConnecting.current = false;
    });
  };

  const getUserMedia = () => {
    const constraints = {
      video: videoAvailable,
      audio: audioAvailable
    };

    return navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        console.log("Got user media");
        window.localStream = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        return stream;
      });
  };

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoAvailable,
        audio: false // We don't need audio for preview
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Store preview stream
      window.previewStream = stream;
    } catch (err) {
      console.error("Error starting preview:", err);
    }
  };

  const stopPreview = () => {
    if (window.previewStream) {
      window.previewStream.getTracks().forEach(track => track.stop());
      window.previewStream = null;
    }
  };

  const connect = () => {
    if (!username || !roomId) {
      alert("Please enter both username and room ID");
      return;
    }

    if (isConnecting.current || !askForUsername) {
      return;
    }

    setAskForUsername(false);

    getUserMedia()
      .then(() => {
        connectToSocketServer();
      })
      .catch((err) => {
        console.error("Media error:", err);
        alert("Could not access camera/microphone. Please check permissions.");
        setAskForUsername(true);
        isConnecting.current = false;
      });
  };

  const toggleAudio = () => {
    if (window.localStream) {
      const audioTrack = window.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (window.localStream) {
      const videoTrack = window.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        
        for (let id in connections) {
          const sender = connections[id].getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        window.localStream = screenStream;
        setScreenSharing(true);
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
        
      } catch (err) {
        console.error("Error starting screen share:", err);
        alert("Could not start screen sharing. Please try again.");
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: videoAvailable,
        audio: audioAvailable
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      for (let id in connections) {
        const sender = connections[id].getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
      
      window.localStream = cameraStream;
      setScreenSharing(false);
      
    } catch (err) {
      console.error("Error stopping screen share:", err);
      alert("Error switching back to camera. Please refresh the page.");
    }
  };

  const toggleHandRaise = () => {
    if (!handRaised) {
      setHandRaised(true);
      socketRef.current.emit("raise-hand", username);
      setRaisedHands(prev => {
        if (!prev.find(hand => hand.socketId === socketIdRef.current)) {
          return [...prev, { socketId: socketIdRef.current, username }];
        }
        return prev;
      });
    } else {
      setHandRaised(false);
      socketRef.current.emit("lower-hand", username);
      setRaisedHands(prev => prev.filter(hand => hand.socketId !== socketIdRef.current));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const endCall = () => {
    Object.values(connections).forEach(connection => {
      if (connection.connectionState !== 'closed') {
        connection.close();
      }
    });
    connections = {};

    if (window.localStream) {
      window.localStream.getTracks().forEach(track => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setVideos([]);
    setAskForUsername(true);
    setUsername("");
    setRoomId("");
    setChatMessages([]);
    setShowChat(false);
    setUnreadMessages(0);
    setScreenSharing(false);
    setHandRaised(false);
    setRaisedHands([]);
    isConnecting.current = false;
  };

  const sendMessage = () => {
    if (chatMessage.trim() && socketRef.current) {
      socketRef.current.emit("chat-message", chatMessage, username);
      setChatMessage("");
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadMessages(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  const hasHandRaised = (socketId) => {
    return raisedHands.find(hand => hand.socketId === socketId);
  };

  const scrollToTop = () => {
    if (meetingContainerRef.current) {
      // Fallback for browsers that don't support smooth scrolling
      try {
        meetingContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } catch (error) {
        // Fallback for older browsers
        meetingContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setShowScrollTop(scrollTop > 300);
  };

  useEffect(() => {
    const initializePermissions = async () => {
      await getPermissions();
      if (askForUsername) {
        startPreview();
      }
    };

    initializePermissions();

    return () => {
      stopPreview();
      stopVoiceTest();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (askForUsername && videoAvailable) {
      startPreview();
    } else {
      stopPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [askForUsername, videoAvailable]);

  return (
    <div className="video-app">
      {askForUsername ? (
        <div className="join-room-container">
          <div className="join-room-card">
            <div className="join-room-header">
              <div className="logo-section">
                <div className="app-logo">📹</div>
                <h1>Join Video Meeting</h1>
                <p>Connect with your team instantly</p>
              </div>
            </div>
            
            <div className="join-room-form">
              <TextField
                label="Meeting Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                variant="outlined"
                fullWidth
                className="modern-input"
                placeholder="Enter room ID (e.g., meeting-123)"
                InputProps={{
                  style: { borderRadius: '12px' }
                }}
              />
              
              <TextField
                label="Your Display Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                fullWidth
                className="modern-input"
                placeholder="Enter your name"
                InputProps={{
                  style: { borderRadius: '12px' }
                }}
              />
              
              <div className="media-preview-enhanced">
                <div className="preview-section-large">
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline
                    className="preview-video-large"
                  />
                  <div className="preview-overlay">
                    <div className="preview-info">
                      <div className="user-preview-info">
                        <Avatar className="preview-avatar">{username[0]?.toUpperCase() || 'U'}</Avatar>
                        <span className="preview-name">{username || 'Your Name'}</span>
                      </div>
                    </div>
                    <div className="preview-controls-enhanced">
                      <IconButton 
                        onClick={toggleAudio} 
                        className={`control-btn ${audioEnabled ? 'active' : 'inactive'}`}
                        title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                      >
                        {audioEnabled ? <MicIcon /> : <MicOffIcon />}
                      </IconButton>
                      <IconButton 
                        onClick={toggleVideo} 
                        className={`control-btn ${videoEnabled ? 'active' : 'inactive'}`}
                        title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                      >
                        {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                      </IconButton>
                    </div>
                  </div>
                  {!videoEnabled && (
                    <div className="video-off-overlay">
                      <div className="video-off-content">
                        <VideocamOffIcon className="video-off-icon" />
                        <p>Camera is off</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Test Section */}
                <div className="voice-test-section">
                  <div className="voice-test-header">
                    <h4>🎤 Microphone Test</h4>
                    <p>Test your microphone to ensure others can hear you clearly</p>
                  </div>
                  
                  <div className="voice-test-controls">
                    <div className="voice-level-container">
                      <div className="voice-level-label">Voice Level:</div>
                      <div className="voice-level-bar">
                        <div 
                          className="voice-level-fill" 
                          style={{ width: `${voiceLevel}%` }}
                        />
                      </div>
                      <div className="voice-level-text">{Math.round(voiceLevel)}%</div>
                    </div>
                    
                    <div className="voice-test-buttons">
                      {!isTestingVoice ? (
                        <Button 
                          variant="outlined" 
                          onClick={startVoiceTest}
                          disabled={!audioAvailable}
                          className="voice-test-btn"
                        >
                          Test Microphone
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          onClick={stopVoiceTest}
                          className="voice-test-btn stop"
                        >
                          Stop Test
                        </Button>
                      )}
                    </div>

                    {voiceCheckPassed && (
                      <div className="voice-check-success">
                        ✅ Microphone is working properly!
                      </div>
                    )}

                    {isTestingVoice && !voiceCheckPassed && (
                      <div className="voice-check-instruction">
                        💬 Please speak into your microphone to test it
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                variant="contained" 
                onClick={connect}
                size="large"
                className="join-button"
                disabled={!roomId || !username}
                fullWidth
              >
                Join Meeting
              </Button>

              {!voiceCheckPassed && roomId && username && (
                <div className="join-suggestion">
                  💡 Consider testing your microphone for the best experience
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="meeting-container" ref={meetingContainerRef} onScroll={handleScroll}>
          {/* Scroll to Top Button */}
          {showScrollTop && (
            <IconButton 
              className="scroll-to-top-btn"
              onClick={scrollToTop}
              title="Scroll to top"
            >
              <KeyboardArrowUpIcon />
            </IconButton>
          )}
          
          {/* Header */}
          <div className="meeting-header">
            <div className="meeting-info">
              <div className="room-info">
                <h3>Room: {roomId}</h3>
                <Chip 
                  icon={<PeopleIcon />} 
                  label={`${videos.length + 1} participant${videos.length === 0 ? '' : 's'}`}
                  size="small"
                  className="participant-chip"
                />
              </div>
              
              {raisedHands.length > 0 && (
                <div className="raised-hands-indicator">
                  <Chip 
                    icon={<PanToolIcon />}
                    label={`${raisedHands.length} hand${raisedHands.length === 1 ? '' : 's'} raised`}
                    size="small"
                    className="hands-raised-chip"
                  />
                </div>
              )}
            </div>
            
            <div className="header-actions">
              <IconButton onClick={() => setShowParticipants(!showParticipants)} className="header-btn">
                <PeopleIcon />
              </IconButton>
              <IconButton onClick={toggleFullscreen} className="header-btn">
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </div>
          </div>

          {/* Video Grid */}
          <div className="video-grid-container">
            <div className={`video-grid ${videos.length === 0 ? 'single-user' : videos.length === 1 ? 'two-users' : 'multiple-users'}`}>
              {/* Local Video */}
              <div className="video-tile local-video-tile">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="video-element"
                />
                <div className="video-overlay">
                  <div className="user-info">
                    <Avatar className="user-avatar">{username[0]?.toUpperCase()}</Avatar>
                    <span className="user-name">
                      {username} (You)
                      {screenSharing && <span className="status-badge">Sharing</span>}
                      {handRaised && <span className="hand-emoji">🙋</span>}
                    </span>
                  </div>
                  <div className="video-controls-overlay">
                    {!audioEnabled && <MicOffIcon className="muted-indicator" />}
                    {!videoEnabled && <VideocamOffIcon className="video-off-indicator" />}
                  </div>
                </div>
              </div>

              {/* Remote Videos */}
              {videos.length === 0 ? (
                <div className="waiting-area">
                  <div className="waiting-content">
                    <div className="waiting-icon">👥</div>
                    <h3>Waiting for others to join</h3>
                    <p>Share the room ID: <strong>{roomId}</strong></p>
                  </div>
                </div>
              ) : (
                videos.map((video, index) => (
                  <div key={video.socketId} className="video-tile remote-video-tile">
                    <video
                      ref={ref => {
                        if (ref && video.stream) {
                          ref.srcObject = video.stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      className="video-element"
                    />
                    <div className="video-overlay">
                      <div className="user-info">
                        <Avatar className="user-avatar">U{index + 1}</Avatar>
                        <span className="user-name">
                          Participant {index + 1}
                          {hasHandRaised(video.socketId) && <span className="hand-emoji">🙋</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="chat-panel">
              <div className="chat-header">
                <h4>Meeting Chat</h4>
                <IconButton onClick={toggleChat} size="small">
                  <CloseIcon />
                </IconButton>
              </div>
              
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.length === 0 ? (
                  <div className="no-messages">
                    <Typography variant="body2">No messages yet. Start the conversation!</Typography>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`message ${msg.socketId === socketIdRef.current ? 'own-message' : 'other-message'}`}
                    >
                      <div className="message-avatar">
                        <Avatar size="small">{msg.sender[0]?.toUpperCase()}</Avatar>
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="sender-name">{msg.sender}</span>
                          <span className="message-time">{msg.timestamp}</span>
                        </div>
                        <div className="message-text">{msg.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="chat-input-area">
                <TextField
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  variant="outlined"
                  size="small"
                  fullWidth
                  className="chat-input"
                />
                <IconButton onClick={sendMessage} className="send-button">
                  <SendIcon />
                </IconButton>
              </div>
            </div>
          )}

          {/* Control Bar */}
          <div className="control-bar">
            <div className="control-group">
              <IconButton 
                className={`control-button ${audioEnabled ? 'active' : 'inactive'}`}
                onClick={toggleAudio}
                disabled={!audioAvailable}
              >
                {audioEnabled ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              
              <IconButton 
                className={`control-button ${videoEnabled ? 'active' : 'inactive'}`}
                onClick={toggleVideo}
                disabled={!videoAvailable}
              >
                {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </div>

            <div className="control-group">
              <IconButton 
                className={`control-button ${screenSharing ? 'active' : 'inactive'}`}
                onClick={toggleScreenShare}
                disabled={!screenAvailable}
              >
                {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>

              <IconButton 
                className={`control-button hand-raise ${handRaised ? 'active' : 'inactive'}`}
                onClick={toggleHandRaise}
              >
                <PanToolIcon />
              </IconButton>

              <IconButton 
                className={`control-button chat ${showChat ? 'active' : 'inactive'}`}
                onClick={toggleChat}
              >
                <ChatIcon />
                {unreadMessages > 0 && (
                  <span className="notification-badge">{unreadMessages}</span>
                )}
              </IconButton>
            </div>
            
            <div className="control-group">
              <IconButton 
                className="control-button end-call"
                onClick={endCall}
              >
                <CallEndIcon />
              </IconButton>
            </div>
          </div>

          {/* Notifications */}
          <Snackbar
            open={showNotification}
            autoHideDuration={4000}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseNotification} severity="info" sx={{ width: '100%' }}>
              {handRaiseNotification}
            </Alert>
          </Snackbar>
        </div>
      )}
    </div>
  );
}

