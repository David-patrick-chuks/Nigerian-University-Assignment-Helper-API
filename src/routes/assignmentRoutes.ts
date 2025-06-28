import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController';
import { assignmentRateLimiter } from '../middleware/rateLimiter';
import { handleValidationErrors, validateAssignmentRequest } from '../middleware/validation';

const router = Router();
const assignmentController = new AssignmentController();

// Health check endpoint
router.get('/health', assignmentController.healthCheck.bind(assignmentController));

// API information endpoint
router.get('/info', assignmentController.getApiInfo.bind(assignmentController));

// Assignment generation endpoint with file download
router.post(
  '/assignments/generate',
  assignmentRateLimiter,
  validateAssignmentRequest,
  handleValidationErrors,
  assignmentController.generateAssignment.bind(assignmentController)
);

// Assignment generation endpoint with JSON response
router.post(
  '/assignments/generate-json',
  assignmentRateLimiter,
  validateAssignmentRequest,
  handleValidationErrors,
  assignmentController.generateAssignmentJson.bind(assignmentController)
);

export default router; 