# SecondOp Backend - Quick Start Guide

Get your SecondOp backend up and running in 5 minutes!

## Prerequisites

Make sure you have these installed:
- ✅ Node.js 18+ (`node --version`)
- ✅ PostgreSQL 14+ (`psql --version`)
- ✅ npm 9+ (`npm --version`)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Minimum required variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secondop_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Server
PORT=3000
NODE_ENV=development
```

### 3. Setup Database

```bash
# Run the automated setup script
npm run db:setup
```

This will:
- Create the database
- Run all migrations
- Create the uploads directory

### 4. (Optional) Add Sample Data

```bash
npm run db:seed
```

This adds:
- 4 subscription plans
- 3 sample doctors
- 1 sample patient
- 1 sample case

**Test Credentials:**
- Doctor: `dr.smith@secondop.com` / `password123`
- Patient: `patient@example.com` / `password123`

### 5. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
✅ Database connected successfully
```

### 6. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "userType": "patient",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Run production build

# Database
npm run db:setup         # Setup database (create + migrate)
npm run db:migrate       # Run migrations only
npm run db:seed          # Add sample data
npm run db:reset         # Reset database (setup + seed)

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm test                 # Run tests
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, validation, etc.
│   ├── database/        # DB connection
│   ├── utils/           # Helpers
│   └── server.ts        # Entry point
├── migrations/          # Database schema
├── scripts/             # Setup scripts
└── uploads/             # File uploads
```

## API Documentation

Once running, your API will be available at:
- Base URL: `http://localhost:3000/api/v1`
- Health Check: `http://localhost:3000/health`

### Main Endpoints:

- **Auth**: `/api/v1/auth/*`
- **Users**: `/api/v1/users/*`
- **Cases**: `/api/v1/cases/*`
- **Messages**: `/api/v1/messages/*`
- **Files**: `/api/v1/files/*`
- **Health**: `/api/v1/health/*`
- **Prescriptions**: `/api/v1/prescriptions/*`
- **Lab Results**: `/api/v1/lab-results/*`
- **Billing**: `/api/v1/billing/*`
- **Appointments**: `/api/v1/appointments/*`
- **Doctors**: `/api/v1/doctors/*`

See [README.md](./README.md) for complete API documentation.

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# If not, start it:
# macOS (Homebrew):
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Windows:
# Start PostgreSQL service from Services app
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=3001
```

### Permission Denied on setup-db.sh

```bash
chmod +x scripts/setup-db.sh
npm run db:setup
```

### Missing Environment Variables

Make sure all required variables in `.env.example` are set in your `.env` file.

## Next Steps

1. ✅ Connect your frontend to the backend
2. ✅ Configure Stripe for payments
3. ✅ Set up email service (SendGrid/AWS SES)
4. ✅ Set up SMS service (Twilio)
5. ✅ Configure AWS S3 for file storage (optional)
6. ✅ Set up monitoring and logging
7. ✅ Deploy to production

## Need Help?

- 📖 Full documentation: [README.md](./README.md)
- 🐛 Issues: Check the logs in `logs/` directory
- 💬 Questions: Contact the development team

## Production Deployment

Before deploying to production:

1. Set `NODE_ENV=production` in `.env`
2. Use strong, unique secrets for JWT keys
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use environment-specific database
6. Enable rate limiting
7. Set up monitoring (e.g., PM2, New Relic)
8. Configure backup strategy

Happy coding! 🚀

