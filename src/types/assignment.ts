export interface AssignmentRequest {
  name: string;
  matric: string;
  department: string;
  courseCode: string;
  courseTitle: string;
  lecturerInCharge: string;
  numberOfPages: number;
  wordCount?: number; 
  question: string;
  fileType: 'doc' | 'docx' | 'pdf' | 'txt';
}

export interface AssignmentResponse {
  success: boolean;
  data?: {
    assignment: string;
    pages: number;
    wordCount: number;
    timestamp: string;
    fileBuffer?: Buffer;
    fileName?: string;
    mimeType?: string;
  };
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DocumentFormat {
  studentInfo: {
    name: string;
    matric: string;
    department: string;
    courseCode: string;
    courseTitle: string;
    lecturerInCharge: string;
  };
  question: string;
  content: string;
} 