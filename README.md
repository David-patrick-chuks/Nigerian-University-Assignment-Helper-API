# Nigerian University Assignment Helper API

An AI-powered backend service designed specifically for Nigerian university students to get comprehensive assignment help using Google's Gemini AI.

## 🚀 Features

- **AI-Powered Assignment Generation**: Uses Google Gemini AI to create comprehensive academic assignments
- **Nigerian University Standards**: Tailored for Nigerian academic requirements and fomatting
- **Customizable Page Requirements**: Generate assignments with specific page counts (1-50 pages)
- **Academic Formatting**: Proper structure with headings, subheadings, and citations
- **Rate Limiting**: Fair usage policies to prevent abuse
- **Input Validation**: Comprehensive validation for all student and course information
- **Security**: CORS protection, helmet security headers, and input sanitization

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nigerian-university-assignment-helper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 10 |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:3000 |

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Assignment Helper API is running",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

#### 2. API Information
```http
GET /api/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Nigerian University Assignment Helper API",
    "version": "1.0.0",
    "description": "AI-powered assignment help for Nigerian university students",
    "endpoints": {
      "POST /api/assignments/generate": "Generate an assignment",
      "GET /api/health": "Health check",
      "GET /api/info": "API information"
    },
    "features": [
      "AI-powered assignment generation",
      "Academic formatting",
      "Nigerian university standards",
      "Customizable page requirements",
      "Rate limiting for fair usage"
    ]
  }
}
```

#### 3. Generate Assignment
```http
POST /api/assignments/generate
```

**Request Body:**
```json
{
  "name": "John Doe",
  "matric": "20/123456",
  "department": "Computer Science",
  "courseCode": "CSC301",
  "courseTitle": "Advanced Programming",
  "lecturerInCharge": "Dr. Smith",
  "numberOfPages": 6,
  "question": "Explain the concept of object-oriented programming and provide examples of its implementation in modern software development."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": "# Object-Oriented Programming: A Comprehensive Analysis\n\n## Introduction\n\nObject-Oriented Programming (OOP) is a fundamental paradigm in modern software development...",
    "pages": 6,
    "wordCount": 3000,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Input Validation Rules

| Field | Validation Rules |
|-------|------------------|
| `name` | 2-100 characters, letters and spaces only |
| `matric` | 5-20 characters, uppercase letters, numbers, and forward slashes |
| `department` | 3-100 characters, letters, spaces, and ampersands |
| `courseCode` | 3-20 characters, uppercase letters and numbers |
| `courseTitle` | 5-200 characters |
| `lecturerInCharge` | 3-100 characters, letters, spaces, and periods |
| `numberOfPages` | Integer between 1-50 |
| `question` | 10-2000 characters |

## 🧪 Testing

### Using cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Generate assignment
curl -X POST http://localhost:3000/api/assignments/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "matric": "20/123456",
    "department": "Computer Science",
    "courseCode": "CSC301",
    "courseTitle": "Advanced Programming",
    "lecturerInCharge": "Dr. Smith",
    "numberOfPages": 6,
    "question": "Explain the concept of object-oriented programming and provide examples of its implementation in modern software development."
  }'
```

### Using JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:3000/api/assignments/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    matric: '20/123456',
    department: 'Computer Science',
    courseCode: 'CSC301',
    courseTitle: 'Advanced Programming',
    lecturerInCharge: 'Dr. Smith',
    numberOfPages: 6,
    question: 'Explain the concept of object-oriented programming and provide examples of its implementation in modern software development.'
  })
});

const data = await response.json();
console.log(data);
```

## 🔒 Security Features

- **CORS Protection**: Configurable allowed origins
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Comprehensive validation for all inputs
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: Secure error messages in production

## 📊 Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Assignment Generation**: 10 requests per 15 minutes per IP

## 🚀 Deployment

### Production Deployment

1. **Set environment variables for production**
   ```env
   NODE_ENV=production
   PORT=3000
   GEMINI_API_KEY=your_production_api_key
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Updates

Stay updated with the latest features and improvements by checking the repository regularly.

---

**Note**: This API is designed for educational purposes. Please ensure compliance with your institution's academic integrity policies when using AI-generated content. 