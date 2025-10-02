// Check if we're in production based on environment variable or build type
const IS_PROD = process.env.REACT_APP_NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

// Use environment variables for server URLs
const server = IS_PROD ?
     (process.env.REACT_APP_PROD_SERVER_URL || "https://meetup-backend-i8u8.onrender.com") :
     (process.env.REACT_APP_SERVER_URL || "http://localhost:8000")

export default server;