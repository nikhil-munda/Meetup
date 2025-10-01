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
                <Link to="/home" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <p>Join as Guest</p>
                </Link>
                <Link to="/auth" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <p>Register</p>
                </Link>
                <div role='button'>
                    <Link to="/auth" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <p>Login</p>
                    </Link>
                </div>
            </div>
        </nav>
        <div className='landingMainContainer'>
        <div><h1><span style={{ color: "orange" }}>Connect</span> Loved Ones</h1>
        <p>Cover your distance by video call</p>
        <div role='button'>
            <Link to={"/home"} style={{ textDecoration: 'none', color: 'inherit' }}>Start Call</Link>
        </div>
        </div>
        <div>
            <img src="/mobile.png" alt="" />
        </div>
        </div>
    </div>
  )
}
