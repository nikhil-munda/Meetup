import React from 'react'
import '../App.css'
import { Link } from "react-router-dom";


export default function LandingPage() {
  return (
    <div className='landingPageContainer'>
        <nav>
            <div className='NavHeader'>
                <h2>Video Calling</h2>
                </div>
            <div className='nav-list'>
                <p>Join as Guest</p>
                <p>Register</p>
                <div role='button'>
                    <p>Login</p>
                </div>
            </div>
        </nav>
        <div className='landingMainContainer'>
        <div><h1><span style={{ color: "orange" }}>Connect</span> Loved Ones</h1>
        <p>Cover your distance by video call</p>
        <div role='button'>
            <Link to={"/auth"}>Start Call</Link>
        </div>
        </div>
        <div>
            <img src="/mobile.png" alt="" />
        </div>
        </div>
    </div>
  )
}
