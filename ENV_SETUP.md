# Environment Configuration

This project uses environment variables for configuration. Follow these steps to set up your environment:

## Backend Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=8000
   NODE_ENV=development

   # Database Configuration
   MONGO_URI=your_mongodb_connection_string_here

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   FRONTEND_PROD_URL=https://meetup-frontend-zdrb.onrender.com
   ```

3. For production, set `NODE_ENV=production` and update the MongoDB URI.

## Frontend Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   ```env
   # Server Configuration
   REACT_APP_SERVER_URL=http://localhost:8000
   REACT_APP_PROD_SERVER_URL=https://your-production-server.com
   REACT_APP_NODE_ENV=development
   ```

3. For production builds, set `REACT_APP_NODE_ENV=production`.

## Environment Variables Reference

### Backend Variables

- `PORT`: Port number for the server (default: 8000)
- `NODE_ENV`: Environment mode (development/production)
- `MONGO_URI`: MongoDB connection string
- `FRONTEND_URL`: Frontend URL for CORS configuration (development)
- `FRONTEND_PROD_URL`: Frontend URL for CORS configuration (production)

### Frontend Variables

- `REACT_APP_SERVER_URL`: Backend server URL for development
- `REACT_APP_PROD_SERVER_URL`: Backend server URL for production
- `REACT_APP_NODE_ENV`: Environment mode (development/production)

## Deployment

For production deployment:

1. Set the appropriate environment variables in your hosting platform
2. Ensure `NODE_ENV=production` for backend
3. Ensure `REACT_APP_NODE_ENV=production` for frontend
4. Update the production server URLs accordingly
5. Set `FRONTEND_PROD_URL=https://meetup-frontend-zdrb.onrender.com` for production CORS

## Security

- Never commit `.env` files to version control
- Use `.env.example` files to document required variables
- Keep sensitive information like database credentials secure