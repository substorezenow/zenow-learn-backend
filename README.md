# Zenow Learn Backend

A production-ready, enterprise-grade Node.js backend for the Zenow Learn educational platform, built with TypeScript, Express.js, and CockroachDB.

## 🚀 Features

### Core Features
- **RESTful API** with comprehensive course management
- **Hierarchical Course Structure** (Categories → Fields → Courses)
- **User Management** with role-based access control
- **Course Enrollment** and progress tracking
- **Content Management** with modules and bundles

### Security Features
- **Enterprise-grade Security** with multi-layered protection
- **Advanced Session Management** with fingerprinting and blacklisting
- **Rate Limiting** with IP blocking and suspicious activity detection
- **CSRF Protection** and input sanitization
- **Security Monitoring** with real-time threat detection
- **AES-256-GCM Encryption** for sensitive data

### Performance Features
- **Redis Caching** with automatic fallback
- **Connection Pooling** for optimal database performance
- **Query Optimization** with slow query detection
- **Structured Logging** with comprehensive error handling

### Production Features
- **Docker Support** with multi-stage builds
- **Health Monitoring** with comprehensive endpoints
- **Database Migrations** with version control
- **Comprehensive Testing** (Unit, Integration, E2E)
- **API Documentation** with OpenAPI/Swagger

## 📋 Prerequisites

- **Node.js** 18+ 
- **CockroachDB** instance
- **Redis** (optional, for caching)
- **Docker** (for containerized deployment)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zenow_learn_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   # Database Configuration
   COCKROACH_URL=postgresql://user:password@host:port/database?sslmode=require
   COCKROACH_HOST=localhost
   COCKROACH_PORT=26257
   COCKROACH_USER=root
   COCKROACH_PASS=password
   COCKROACH_DB=zenow_learn
   COCKROACH_SSL=true

   # Redis Configuration (Optional)
   REDIS_URL=redis://localhost:6379

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key

   # Server Configuration
   PORT=8080
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate

   # Create admin user
   npm run create-admin
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## 🏗️ Project Structure

```
src/
├── config/                 # Configuration files
├── controllers/           # Request handlers
├── middleware/            # Express middleware
│   ├── authMiddleware.ts  # Authentication middleware
│   ├── errorHandler.ts   # Error handling
│   ├── validation.ts     # Input validation
│   └── securityHeaders.ts # Security headers
├── models/               # Data models
├── routes/               # API routes
├── services/             # Business logic services
│   ├── securityMonitor.ts # Security monitoring
│   ├── rateLimitService.ts # Rate limiting
│   └── sessionService.ts  # Session management
├── utils/                # Utility functions
│   ├── databaseManager.ts # Database connection
│   └── cacheManager.ts   # Redis caching
├── migrations/           # Database migrations
├── types/               # TypeScript type definitions
└── index.ts            # Application entry point
```

## 🔧 API Documentation

### Base URL
```
http://localhost:8080/api
```

### Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/admin/categories` - Create category (Admin)
- `PUT /api/admin/categories/:id` - Update category (Admin)
- `DELETE /api/admin/categories/:id` - Delete category (Admin)

#### Fields
- `GET /api/fields` - Get all fields
- `GET /api/fields/:id` - Get field by ID
- `GET /api/categories/:id/fields` - Get fields by category
- `POST /api/admin/fields` - Create field (Admin)
- `PUT /api/admin/fields/:id` - Update field (Admin)
- `DELETE /api/admin/fields/:id` - Delete field (Admin)

#### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `GET /api/courses/slug/:slug` - Get course by slug
- `GET /api/fields/:id/courses` - Get courses by field
- `POST /api/courses/:id/enroll` - Enroll in course
- `POST /api/admin/courses` - Create course (Admin)
- `PUT /api/admin/courses/:id` - Update course (Admin)
- `DELETE /api/admin/courses/:id` - Delete course (Admin)

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

#### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Get all users
- `GET /api/admin/security-dashboard` - Security dashboard
- `POST /api/admin/users/:id/block` - Block user
- `POST /api/admin/users/:id/unblock` - Unblock user

### Query Parameters

#### Course Filtering
```
GET /api/courses?category_id=1&field_id=2&difficulty_level=beginner&is_free=true&search=javascript&limit=10&page=1
```

#### Pagination
```
GET /api/courses?page=1&limit=20&sort=desc&sortBy=created_at
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "count": 10,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/courses",
  "method": "GET"
}
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens** with configurable expiration
- **Session Management** with fingerprinting
- **Role-based Access Control** (Student, Instructor, Admin, Superuser)
- **Password Hashing** with bcrypt

### Security Monitoring
- **Real-time Threat Detection** with suspicious activity monitoring
- **IP Blocking** for malicious behavior
- **Rate Limiting** with progressive penalties
- **Security Event Logging** with severity levels

### Data Protection
- **Input Sanitization** and validation
- **CSRF Protection** for state-changing operations
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with content security policies

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
```
tests/
├── unit/                 # Unit tests
│   ├── services/        # Service layer tests
│   ├── models/          # Model tests
│   └── middleware/      # Middleware tests
├── integration/         # Integration tests
│   ├── controllers.test.ts
│   └── api.test.ts
├── e2e/                 # End-to-end tests
└── setup.ts            # Test setup
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t zenow-learn-backend .

# Run container
docker run -p 8080:8080 --env-file .env zenow-learn-backend
```

### Google Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy zenow-learn-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8080
COCKROACH_URL=your-production-db-url
REDIS_URL=your-production-redis-url
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📊 Monitoring & Observability

### Health Checks
- `GET /api/health` - Application health status
- `GET /api/admin/security-dashboard` - Security metrics

### Logging
- **Structured Logging** with JSON format
- **Error Tracking** with stack traces
- **Performance Monitoring** with slow query detection
- **Security Event Logging** with audit trails

### Metrics
- **Request/Response Metrics**
- **Database Performance Metrics**
- **Cache Hit/Miss Ratios**
- **Security Event Counts**

## 🔧 Development

### Available Scripts
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run migrate          # Run database migrations
npm run migrate:status   # Check migration status
npm run migrate:rollback # Rollback last migration
npm run create-admin     # Create admin user
npm run check-users      # Check user accounts
```

### Code Quality
- **TypeScript** with strict mode
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing
- **Supertest** for API testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🔄 Changelog

### v1.0.0
- Initial release with core features
- Security monitoring and rate limiting
- Comprehensive testing suite
- Production-ready deployment configuration
