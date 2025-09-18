import React, { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import { AuthContext } from '../contexts/AuthContext';

export default function Authentication() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    remember: false
  });
  const [formState, setFormState] = useState(0); // 0 for signin, 1 for signup
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState({}); // Changed from undefined to empty object
  const { handleRegister, handleLogin } = React.useContext(AuthContext);
  const[username,setUsername]= useState("");
  const[password,setPassword]= useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.username) errs.username = 'Email is required';
    if (!formData.password) errs.password = 'Password is required';
    if (formState === 1 && !formData.name) errs.name = 'Name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (formState === 0) {
        const result = await handleLogin(formData.username, formData.password);
        setMessage('Login successful');

      } else {
        const result = await handleRegister(formData.name, formData.username, formData.password);
        setMessage('Registration successful');
        setOpen(true);
        setUsername('');
        setErrors({});
        setPassword('');
        setFormState(0);
      }
      setOpen(true);
    } catch (err) {
      console.log(err);
      
      setMessage(err.response?.data?.message || 'An error occurred');
      setOpen(true);
    }
  };

  
  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <CssBaseline />
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage: 'url(/background.png)',
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
 
          <Box sx={{ mb: 3 }}>
            <Button 
              variant={formState === 0 ? "contained" : "text"} 
              onClick={() => setFormState(0)}
              sx={{ mr: 1 }}
            >{formState === 0 ? 'Sign In' : 'Sign In'}</Button>
             
            <Button 
              variant={formState === 1 ? "contained" : "text"} 
              onClick={() => setFormState(1)}
            >
              Sign Up
            </Button>
          </Box>
          
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {formState === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="email"
              value={formData.username}
              onChange={handleChange}
              error={Boolean(errors.username)}
              helperText={errors.username}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={Boolean(errors.password)}
              helperText={errors.password}
            />

            {Object.keys(errors).length > 0 && (
              <Box sx={{ color: "error.main", mt: 2 }}>
                {Object.values(errors).map((error, index) => (
                  <Typography key={index} variant="body2" color="error">
                    {error}
                  </Typography>
                ))}
              </Box>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {formState === 0 ? 'Sign In' : 'Sign Up'}
            </Button>
          </Box>
        </Box>
      </Grid>
      <Snackbar 
        open={open}
        autoHideDuration={6000}
        onClose={() => setOpen(false)}
        message={message}
      />
    </Grid>
  );
}
