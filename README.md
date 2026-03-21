# Project Learning Module

A comprehensive full-stack Project Learning Module integrated into an LMS system using React (frontend), Node.js + Express (backend), and MySQL (database).

## Features

### Core Features
- **Authentication System**: JWT-based login/register with protected routes
- **Dashboard Integration**: Project Learning section with progress tracking
- **Roadmap Page**: Visual level progression (Level 1-5) with status indicators
- **Project Listing**: Level-based project browsing with progress tracking
- **Learning View**: Split-screen layout with step-by-step learning
- **Progress Tracking**: Save and resume user progress across projects

### Technical Features
- React functional components with hooks
- React Router for navigation
- Context API for authentication state
- Axios for API communication
- Express.js REST APIs
- MySQL database with proper relationships
- JWT authentication middleware
- Responsive design with modern UI

## Project Structure

### Backend (Node.js + Express + MySQL)
```
backend/
├── config/
│   └── db.js                 # MySQL database connection
├── controllers/
│   ├── authController.js     # Authentication logic
│   └── projectController.js  # Project and progress logic
├── middleware/
│   └── authMiddleware.js     # JWT authentication middleware
├── models/
│   ├── userModel.js          # User database operations
│   ├── projectModel.js       # Project database operations
│   ├── stepModel.js          # Step database operations
│   └── progressModel.js      # Progress tracking operations
├── routes/
│   ├── authRoutes.js         # Authentication endpoints
│   └── projectRoutes.js      # Project and progress endpoints
├── utils/
│   └── token.js              # JWT token utilities
├── database/
│   └── setup.sql             # Database schema and sample data
├── .env                      # Environment variables
├── package.json
└── server.js                 # Express server setup
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Button.jsx    # Reusable button component
│   │       ├── Card.jsx      # Reusable card component
│   │       └── ProgressBar.jsx # Progress bar component
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── pages/
│   │   ├── Login.jsx         # Login/Register page
│   │   ├── Dashboard.jsx     # User dashboard
│   │   ├── RoadmapPage.jsx   # Learning roadmap
│   │   ├── ProjectPage.jsx   # Project listing
│   │   └── LearningPage.jsx  # Step-by-step learning view
│   ├── services/
│   │   └── api.js            # API service layer
│   ├── App.jsx               # Main app component with routing
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Database Schema

### Tables
- **Users**: id, name, email, password, created_at
- **Projects**: id, title, level, description, created_at
- **Steps**: id, project_id, title, explanation, code_snippet, step_order, created_at
- **Progress**: id, user_id, project_id, step_completed, updated_at

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/level/:level` - Get projects by level
- `GET /api/projects/:id` - Get project by ID
- `GET /api/projects/:projectId/steps` - Get project steps

### Progress
- `GET /api/projects/progress/user` - Get user progress
- `POST /api/projects/progress` - Update user progress
- `GET /api/projects/dashboard/stats` - Get dashboard statistics

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MySQL Server
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Create database and tables:
```bash
mysql -u root -p < database/setup.sql
```

5. Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Dashboard**: View your learning progress and continue from where you left off
3. **Roadmap**: Explore learning levels and track overall progress
4. **Projects**: Browse projects by level and start learning
5. **Learning View**: Follow step-by-step tutorials with live code editor

## Sample Data

The system comes pre-loaded with:
- 10 sample projects across 5 difficulty levels
- Complete Todo App tutorial (5 steps)
- Calculator App tutorial (3 steps)
- Progressive difficulty from beginner to expert

## Features Highlight

### Authentication
- JWT-based secure authentication
- Protected routes with automatic redirect
- User session persistence

### Learning Experience
- Step-by-step progression
- Interactive code editor with live output
- Progress saving and resume functionality
- Visual progress indicators

### UI/UX
- Clean, modern LMS-style design
- Responsive layout for all devices
- Smooth animations and transitions
- Intuitive navigation

### Progress Tracking
- Real-time progress updates
- Dashboard statistics
- Level completion tracking
- Step-level progress persistence

## Technologies Used

### Backend
- Node.js
- Express.js
- MySQL
- JWT (jsonwebtoken)
- bcryptjs
- cors
- dotenv

### Frontend
- React 18
- React Router DOM
- Axios
- Vite
- CSS-in-JS (styled-jsx)

## Development

### Adding New Projects
1. Add project to `Projects` table
2. Add steps to `Steps` table with proper `step_order`
3. Include detailed explanations and code snippets

### Customizing Styles
- Modify `src/index.css` for global styles
- Component-specific styles are included using styled-jsx
- Follow the existing design system for consistency

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
"# projectLMS" 
