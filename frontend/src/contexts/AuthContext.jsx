import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import server from '../environment';

export const AuthContext = createContext();

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

export const AuthProvider = ({ children}) =>{
    const authContext = useContext(AuthContext);

    const[userData, setUserData] = useState(authContext);

    const router = useNavigate();

    const handleRegister = async(name,username,password)=>{
        try{
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })

            if(request.status === 201){
                setUserData({ name, username });
                router("/home");
                return request.data.message;
            }
        }catch(error){
            throw error;
        }
    }

    const handleLogin = async(username,password)=>{
        try{
            let request = await client.post("/login",{
                username: username,
                password: password
            })

            if(request.status === 200){
                localStorage.setItem("token", request.data.token);
                setUserData({ username, token: request.data.token });
                router("/home");
                return request.data.message;
            }
        }catch(err){
            throw err;
        }
    }

    const data= {
        userData,setUserData,handleRegister,handleLogin
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
}