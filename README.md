# Nigerian University Assignment Helper API

This API helps Nigerian university students generate AI-powered assignment content and formatted documents (PDF, DOCX, TXT) using the Gemini API.

## Features
- AI-powered assignment generation
- Academic formatting (student info, question, content)
- Multiple file formats: PDF, DOCX, TXT
- Rate limiting and input validation
- Supports long assignments by splitting into sections and tracking progress
- **Smart Section Splitting**: Automatically divides long assignments into logical sections (400-600 words each) with descriptive titles
- **Word Count Optimization**: Automatically expands content if word count is below 90% of target (up to 3 expansion rounds)
- **Progress Tracking**: Real-time progress updates for long assignments
- **Page Numbering**: Automatic page numbers in PDF and DOCX formats for professional presentation
- Test script with word count comparison and expansion tracking

## Endpoints

### Health Check
- `GET /api/health`

### API Info
- `GET /api/info`

### Generate Assignment (Unified, with Job Status)
- `POST /api/assignments/generate`
- **Description:** Generate an assignment file (doc, docx, pdf, txt). For large assignments (more than 3 pages or 1500 words), the API will process the request as a background job and return a `jobId` immediately. For small assignments, the file is returned directly.
- **Request Body Example:**
```json
{
  "name": "NWAFOR SALOME KACHI",
  "matric": "22/15CA175",
  "department": "HISTORY AND INTERNATIONAL STUDIES",
  "courseCode": "HIS301",
  "courseTitle": "INTERNATIONAL POLITICAL SYSTEM",
  "lecturerInCharge": "PROFESSOR ADEBAYO",
  "fileType": "pdf",
  "numberOfPages": 10,
  "question": "What major political or cultural kingdoms existed in East and Central Africa around 1800 AD, and what roles did they play in regional affairs?"
}
```
- **Response:**
  - For small assignments: returns the file directly.
  - For large assignments: returns `{ success: true, jobId }` and processes the job in the background.

### Check Job Status / Download Result
- `GET /api/jobs/:jobId`
- **Description:** Poll this endpoint to check the status (`pending`, `in_progress`, `completed`, `failed`) and progress (percentage) of a long-running assignment job. When `completed`, the result includes the file (as base64), file name, and MIME type.
- **Response Example:**
```json
{
  "success": true,
  "status": "completed",
  "progress": 100,
  "result": {
    "fileName": "assignment_22_15CA175.pdf",
    "mimeType": "application/pdf",
    "buffer": "...base64...",
    "finalWordCount": 4850,
    "targetWordCount": 5000,
    "expansionsUsed": 2
  }
}
```

**Result Fields:**
- `fileName`: Generated file name
- `mimeType`: File MIME type
- `buffer`: File content as base64 string
- `finalWordCount`: Actual word count of the generated assignment
- `targetWordCount`: Target word count based on requested pages
- `expansionsUsed`: Number of expansion rounds used to reach target word count

## Word Count Logic
- The API estimates word count and number of pages for each assignment.
- For long assignments (>3 pages or >1500 words), the system uses smart section splitting:
  - **Section Splitting**: Divides content into logical sections of 400-600 words each
  - **Descriptive Titles**: Uses meaningful section titles (e.g., "Background and Context", "Main Analysis", "Critical Evaluation")
  - **Automatic Expansion**: If the final word count is below 90% of target, the system automatically generates additional content (up to 3 expansion rounds)
- The test script compares the expected word count (numberOfPages × 500) with the actual word count returned by the API, and shows expansion information.

## Test Script
- Run `node test-api.js` to test the API endpoints.
- The script saves all responses and files to the `test-output/` folder.
- It now prints both the expected and actual word count for assignment generation.
- For large assignments, the script will poll for job status and download the result when ready.
- **New**: Includes a test for a 10-page assignment to demonstrate section splitting and expansion features.

## Setup
1. Clone the repo and install dependencies:
   ```sh
   npm install
   ```
2. Set up your `.env` file with your Gemini API key, MongoDB URI, and other config.
3. Start the server:
   ```sh
   npm run dev
   ```
4. Run the test script:
   ```sh
   node test-api.js
   ```

## Notes
- The Gemini API has a maximum output length per call. For very long assignments, the backend splits the work into sections and combines the results.
- Formatting is best-effort and can be customized in the codebase.

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