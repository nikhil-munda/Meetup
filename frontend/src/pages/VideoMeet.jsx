import React, { useState, useRef, useEffect, use  } from 'react'
import '../style/VideoComponent.css'
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

const serverURL = "http://localhost:8000";


var connections={}

const peerConnectionConfig={
    "iceServers":[
        {"urls": "stun:stun.l.google.com:19302"}
    ]
}

export default function VideoMeetComponent() {

    var socketRef= useRef()
    let socketIdRef= useRef()

    let localVideoRef= useRef()


    let [videoAvailable, setVideoAvailable]= useState(true);
    let [audioAvailable, setAudioAvailable]= useState(true);
    let [video, setVideo]= useState()
    let [audio, setAudio]= useState()
    let [screen,setScreen]= useState()
    let [showModel, setShowModel]= useState()
    let [screenSharing, setScreenSharing]= useState()
    let [messages, setMessages]= useState([])
    let [message, setMessage]= useState("")
    let [newmessages, setNewMessages]= useState(0)
    let [askForUsername, setAskForUsername]= useState(true)
    let [username, setUsername]= useState("")
    let [screenAvailable, setScreenAvailable] = useState(false);


    const videoRef= useRef()

    let [ videos, setVideos]= useState([])

        // if (isChrome()==false){
        //     alert("This application only works in Chrome")
        // }

    const connect = () => {
        getMedia();
    };


    const getPermissions = async()=>{
        try{
            const videoPermission = await navigator.mediaDevices.getUserMedia({video:true})
            if(videoPermission){
                setVideoAvailable(true)
            }
            else{
                setVideoAvailable(false)
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({audio:true})
            if(audioPermission){
                setAudioAvailable(true)
            }
            else{
                setAudioAvailable(false)
            }

            if(navigator.mediaDevices.getUserMedia){
                 setScreenAvailable(true)
            }else{
                setScreenAvailable(false)
            }

            if(videoAvailable || audioAvailable){
                const useMediaStream = await navigator.mediaDevices.getUserMedia({video:videoAvailable, audio:audioAvailable})
                if(useMediaStream){
                    window.localStream = useMediaStream;
                    if(localVideoRef.current){
                        localVideoRef.current.srcObject = useMediaStream;
                    }
                }
            }
        } catch(err){
            // Handle error here
            console.log(err);

        }
    }
    useEffect(()=>{
        getPermissions();
    },[])

    let getUserMediaSuccess=(stream)=>{



    }

    let getUserMedia= ()=>{
        if ((video && videoAvailable) || (audio && audioAvailable)) {
     navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
        .then(() => { }) // get usermedia
        .then((stream) => { })
        .catch((err) => { console.log(err) });
}
else{
            try{
                let tracks=localVideoRef.current.srcObject.getTracks()
                tracks.forEach((track)=> track.stop())
            }catch(err){

            }
        }
    }

    useEffect(() => {
     if (video !== undefined && audio !== undefined) {
          getUserMedia();
          getMedia();
     }
    }, [audio, video]);


    let getMedia = () => {
        setVideo(videoAvailable)
        setAudio(audioAvailable)
        // connectToSocketServer()
    }

  return (
    <>
      {askForUsername == true? 
        <div>

            <h2>Enter into Lobby</h2>
            <TextField id="outlined-basic" label="username" value={username} onChange={(e) => setUsername(e.target.value)}  variant="outlined" />
            <Button variant="contained" onClick={connect}>Connect</Button>

        <div>
            <video ref={localVideoRef} autoPlay muted ></video>
            </div>
        </div>

        : <></>
      }
    </>
  )
}
