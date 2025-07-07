import { Router } from 'express';
import passport from 'passport';
import { AssignmentController } from '../controllers/assignmentController';
import { assignmentRateLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload';
import { handleValidationErrors, validateAssignmentRequest } from '../middleware/validation';

const router = Router();
const assignmentController = new AssignmentController();

// Health check endpoint
router.get('/health', assignmentController.healthCheck.bind(assignmentController));

// API information endpoint
router.get('/info', assignmentController.getApiInfo.bind(assignmentController));

// Assignment generation endpoint with file download
router.post(
  '/generate',
  assignmentRateLimiter,
  validateAssignmentRequest,
  handleValidationErrors,
  assignmentController.generateAssignment.bind(assignmentController)
);

// Assignment generation endpoint with JSON response
router.post(
  '/generate-json',
  assignmentRateLimiter,
  validateAssignmentRequest,
  handleValidationErrors,
  assignmentController.generateAssignmentJson.bind(assignmentController)
);

// Add job status route
router.get('/jobs/:jobId', assignmentController.getJobStatus.bind(assignmentController));

// Assignment generation endpoint with file upload
router.post('/solve', passport.authenticate('jwt', { session: false }), upload.single('file'), assignmentController.generateAssignment.bind(assignmentController));

export default router; 