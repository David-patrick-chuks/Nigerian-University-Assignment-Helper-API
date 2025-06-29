import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ValidationError } from '../types/assignment';

export const validateAssignmentRequest = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('matric')
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Matric number must be between 5 and 20 characters')
    .matches(/^[A-Z0-9/]+$/)
    .withMessage('Matric number can only contain uppercase letters, numbers, and forward slashes'),

  body('department')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Department must be between 3 and 100 characters')
    .matches(/^[a-zA-Z\s&]+$/)
    .withMessage('Department can only contain letters, spaces, and ampersands'),

  body('courseCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Course code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Course code can only contain uppercase letters and numbers'),

  body('courseTitle')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters'),

  body('lecturerInCharge')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Lecturer name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Lecturer name can only contain letters, spaces, and periods'),

  body('numberOfPages')
    .isInt({ min: 1, max: 100 })
    .withMessage('Number of pages must be between 1 and 100'),

  body('question')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Question must be between 10 and 2000 characters'),

  body('fileType')
    .trim()
    .isIn(['doc', 'docx', 'pdf', 'txt'])
    .withMessage('File type must be one of: doc, docx, pdf, txt'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg
    }));

    // Include the first field name in the main error string for test compatibility
    const firstField = validationErrors[0]?.field || 'unknown';
    return res.status(400).json({
      success: false,
      error: `Validation failed: ${firstField}`,
      validationErrors
    });
  }

  return next();
}; 