# Admin API Documentation

## Overview
Admin API endpoints for managing the Zenow Academy course hierarchy. All admin routes require authentication with a valid JWT token.

**Base URL**: `http://localhost:8080/api/admin`

## Authentication
All admin routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Admin Statistics

### Get Dashboard Statistics
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_categories": 5,
    "total_fields": 15,
    "published_courses": 8,
    "draft_courses": 2,
    "total_enrollments": 45,
    "total_students": 30,
    "total_admins": 2
  }
}
```

## Categories Management

### Get All Categories (Admin View)
```http
GET /api/admin/categories
```
Returns all categories including inactive ones.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "General Education",
      "slug": "general-education",
      "description": "Basic education courses",
      "icon_url": "/icons/general.svg",
      "banner_image": "/banners/general.jpg",
      "is_active": true,
      "sort_order": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 5
}
```

### Create Category
```http
POST /api/admin/categories
```

**Request Body:**
```json
{
  "name": "New Category",
  "slug": "new-category",
  "description": "Category description",
  "icon_url": "/icons/new.svg",
  "banner_image": "/banners/new.jpg",
  "sort_order": 6
}
```

### Update Category
```http
PUT /api/admin/categories/:id
```

**Request Body:**
```json
{
  "name": "Updated Category",
  "slug": "updated-category",
  "description": "Updated description",
  "is_active": true,
  "sort_order": 1
}
```

### Delete Category (Soft Delete)
```http
DELETE /api/admin/categories/:id
```

## Fields Management

### Get All Fields (Admin View)
```http
GET /api/admin/fields
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Computer Science",
      "slug": "computer-science",
      "description": "Programming courses",
      "category_name": "Engineering",
      "category_slug": "engineering",
      "course_count": 4,
      "is_active": true,
      "sort_order": 1
    }
  ],
  "count": 15
}
```

### Create Field
```http
POST /api/admin/fields
```

**Request Body:**
```json
{
  "category_id": 2,
  "name": "Data Science",
  "slug": "data-science",
  "description": "Data science and analytics courses",
  "icon_url": "/icons/data.svg",
  "banner_image": "/banners/data.jpg",
  "sort_order": 6
}
```

### Update Field
```http
PUT /api/admin/fields/:id
```

### Delete Field (Soft Delete)
```http
DELETE /api/admin/fields/:id
```

## Courses Management

### Get All Courses (Admin View)
```http
GET /api/admin/courses
```
Returns all courses including unpublished ones.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Frontend Development with React",
      "slug": "frontend-react",
      "description": "Complete React.js course",
      "short_description": "Master React.js",
      "duration_hours": 40,
      "difficulty_level": "intermediate",
      "price": 99.99,
      "is_free": false,
      "is_published": true,
      "field_name": "Computer Science",
      "category_name": "Engineering",
      "instructor_name": "admin_user",
      "enrolled_students": 15,
      "rating": 4.5,
      "total_ratings": 12
    }
  ],
  "count": 10
}
```

### Create Course
```http
POST /api/admin/courses
```

**Request Body:**
```json
{
  "field_id": 4,
  "title": "Advanced React Patterns",
  "slug": "advanced-react-patterns",
  "description": "Learn advanced React patterns and best practices",
  "short_description": "Advanced React development",
  "banner_image": "/banners/advanced-react.jpg",
  "thumbnail_image": "/thumbnails/advanced-react.jpg",
  "duration_hours": 25,
  "difficulty_level": "advanced",
  "price": 149.99,
  "is_free": false,
  "is_published": false,
  "prerequisites": "Basic React knowledge required",
  "learning_outcomes": ["Master advanced patterns", "Build scalable apps"],
  "course_modules": ["Introduction", "Patterns", "Best Practices"],
  "tags": ["react", "advanced", "patterns"]
}
```

### Update Course
```http
PUT /api/admin/courses/:id
```

### Delete Course (Soft Delete)
```http
DELETE /api/admin/courses/:id
```

## Course Modules Management

### Create Course Module
```http
POST /api/admin/courses/:courseId/modules
```

**Request Body:**
```json
{
  "title": "Introduction to React Hooks",
  "description": "Learn about React hooks and their usage",
  "module_type": "video",
  "content_url": "https://example.com/video1.mp4",
  "duration_minutes": 45,
  "sort_order": 1,
  "is_free": true
}
```

### Update Course Module
```http
PUT /api/admin/modules/:moduleId
```

**Request Body:**
```json
{
  "title": "Updated Module Title",
  "description": "Updated description",
  "module_type": "quiz",
  "content_url": "https://example.com/quiz1",
  "duration_minutes": 30,
  "sort_order": 2,
  "is_free": false
}
```

### Delete Course Module
```http
DELETE /api/admin/modules/:moduleId
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (Invalid or missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Usage Examples

### Creating a Complete Course Hierarchy

1. **Create Category:**
```bash
curl -X POST http://localhost:8080/api/admin/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Development",
    "slug": "web-development",
    "description": "Complete web development courses",
    "sort_order": 6
  }'
```

2. **Create Field:**
```bash
curl -X POST http://localhost:8080/api/admin/fields \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 6,
    "name": "Frontend Development",
    "slug": "frontend-development",
    "description": "Frontend development courses"
  }'
```

3. **Create Course:**
```bash
curl -X POST http://localhost:8080/api/admin/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field_id": 16,
    "title": "Vue.js Fundamentals",
    "slug": "vuejs-fundamentals",
    "description": "Learn Vue.js from scratch",
    "duration_hours": 30,
    "difficulty_level": "beginner",
    "price": 79.99,
    "is_published": true
  }'
```

4. **Add Course Module:**
```bash
curl -X POST http://localhost:8080/api/admin/courses/11/modules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vue.js Introduction",
    "description": "Getting started with Vue.js",
    "module_type": "video",
    "duration_minutes": 30,
    "sort_order": 1,
    "is_free": true
  }'
```

This admin API provides complete CRUD functionality for managing the course hierarchy while keeping the public API clean and secure.
