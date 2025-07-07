# Nigerian University Assignment Helper API

This API helps Nigerian university students generate AI-powered assignment content and formatted documents (PDF, DOCX, TXT) using the Gemini API. Includes user authentication, credit system, and multiple AI-powered features.

## Features
- **User Authentication**: Register, login, and Google OAuth integration
- **Credit System**: Paystack integration for purchasing credits
- **AI-powered assignment generation** with academic formatting
- **Multiple AI Features**: Project generation, document summarization, quiz generation, flashcard creation
- **File Upload Support**: Accept text input or file uploads for all features
- **Multiple file formats**: PDF, DOCX, TXT
- **Rate limiting and input validation**
- **Smart Section Splitting**: Automatically divides long assignments into logical sections
- **Word Count Optimization**: Automatically expands content if word count is below target
- **Progress Tracking**: Real-time progress updates for long assignments
- **Page Numbering**: Automatic page numbers in PDF and DOCX formats

## API CONTRACT & FRONTEND INTEGRATION

### Base URL
`http://localhost:3000/api`

---

## 1. Authentication

### Register
- **POST** `/auth/register`
- **Body:**
  ```json
  { "email": "user@example.com", "password": "password123", "fullName": "John Doe" }
  ```
- **Response:**
  ```json
  { "token": "JWT_TOKEN", "refreshToken": "REFRESH_TOKEN", "user": { "id": "userId", "email": "user@example.com", "fullName": "John Doe", "credits": 10 } }
  ```

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```
- **Response:**
  ```json
  { "token": "JWT_TOKEN", "refreshToken": "REFRESH_TOKEN", "user": { "id": "userId", "email": "user@example.com", "fullName": "John Doe", "credits": 42 } }
  ```

### Google Login
- **GET** `/auth/google`
- **Description:** Initiates Google OAuth flow
- **Response:** Redirects to Google OAuth consent screen

### Google Callback
- **GET** `/auth/google/callback`
- **Description:** Google OAuth callback endpoint
- **Response:** Redirects to dashboard with tokens

### Refresh Token
- **POST** `/auth/refresh`
- **Headers:** `Authorization: Bearer OLD_JWT_TOKEN`
- **Response:**
  ```json
  { "token": "NEW_JWT_TOKEN" }
  ```

---

## 2. Credit System (Paystack)

### Get Balance
- **GET** `/credits/balance`
- **Headers:** `Authorization: Bearer JWT_TOKEN`
- **Response:**
  ```json
  { "credits": 42 }
  ```

### Buy Credits (initiate Paystack payment)
- **POST** `/credits/buy`
- **Headers:** `Authorization: Bearer JWT_TOKEN`
- **Body:**
  ```json
  { "amount": 1000 }
  ```
- **Response:**
  ```json
  { "paymentUrl": "https://paystack.com/pay/xyz123" }
  ```

### Verify Payment
- **GET** `/credits/verify?reference=PAYSTACK_REF`
- **Headers:** `Authorization: Bearer JWT_TOKEN`
- **Response:**
  ```json
  { "success": true, "creditsAdded": 100, "newBalance": 142 }
  ```

---

## 3. Feature Endpoints

All require `Authorization: Bearer JWT_TOKEN`.

### Assignment Solution Generator
- **POST** `/assignment/solve`
- **Body:**
  - Text: `{ "question": "Explain the process of photosynthesis." }`
  - File: `multipart/form-data` with file field `file`
- **Response:**
  ```json
  { "solution": "Photosynthesis is the process by which green plants..." }
  ```

### Final Year Project Generator (5 credits)
- **POST** `/project/generate`
- **Body:**
  - Text: `{ "topic": "Design and Implementation of a Library Management System" }`
  - File: `multipart/form-data` with file field `file`
- **Response:**
  ```json
  { "project": "Chapter 1: Introduction..." }
  ```

### Document Summarizer (2 credits)
- **POST** `/summarize`
- **Body:**
  - Text: `{ "content": "Long document text here..." }`
  - File: `multipart/form-data` with file field `file`
- **Response:**
  ```json
  { "summary": "This document discusses..." }
  ```

### Quiz & MCQ Generator (3 credits)
- **POST** `/quiz/generate`
- **Body:**
  - Text: `{ "content": "Text to generate quiz from..." }`
  - File: `multipart/form-data` with file field `file`
- **Response:**
  ```json
  { "quiz": [ { "question": "What is photosynthesis?", "options": ["A", "B", "C", "D"], "answer": "A" } ] }
  ```

### Flashcard Generator (2 credits)
- **POST** `/flashcards/generate`
- **Body:**
  - Text: `{ "content": "Text to generate flashcards from..." }`
  - File: `multipart/form-data` with file field `file`
- **Response:**
  ```json
  { "flashcards": [ { "front": "What is photosynthesis?", "back": "Process by which plants..." } ] }
  ```

---

## 4. File Upload Notes
- Use `multipart/form-data` for file uploads.
- Field name for file: `file`
- Supported formats: PDF, DOC, DOCX, TXT
- Maximum file size: 10MB
- Text and file are mutually exclusive in each request.

---

## 5. Token Usage
- All endpoints (except register/login/google) require `Authorization: Bearer JWT_TOKEN` in headers.
- Use `/auth/refresh` to get a new token if expired.

---

## 6. Example Frontend Usage (React Native + Axios)

### Axios Setup
```ts
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3000/api' });
export const setAuthToken = (token: string | null) => {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
};
export default api;
```

### Auth Example
```ts
import { register, login } from './hooks/useAuthApi';
const res = await register('email', 'password', 'Full Name');
// res.token, res.user
```

### Credits Example
```ts
import { getCredits, buyCredits, verifyPayment } from './hooks/useCreditsApi';
const balance = await getCredits();
const { paymentUrl } = await buyCredits(1000); // Naira
const verify = await verifyPayment('paystack_ref');
```

### Feature Example (Text)
```ts
import { solveAssignment } from './hooks/useFeatureApi';
const res = await solveAssignment({ question: 'Explain photosynthesis' });
```

### Feature Example (File Upload)
```ts
import { solveAssignment } from './hooks/useFeatureApi';
const file = { uri, name, type }; // from DocumentPicker or ImagePicker
const res = await solveAssignment({ file });
```

---

## Setup
1. Clone the repo and install dependencies:
   ```sh
   npm install
   ```
2. Set up your `.env` file with all required environment variables (see .env.example)
3. Start the server:
   ```sh
   npm run dev
   ```
4. Run the test script:
   ```sh
   node test-api.js
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | JWT access token secret | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |

## Notes
- The Gemini API has a maximum output length per call. For very long assignments, the backend splits the work into sections and combines the results.
- All feature endpoints deduct credits from the user's account.
- Google OAuth flow redirects to dashboard with tokens for web applications.
- File uploads are stored in memory and processed immediately.

---

For more details, see the code and comments in each file.

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