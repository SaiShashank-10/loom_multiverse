import express from 'express';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../../middleware/auth';
import passDocumentController from './index';

const router = express.Router();

// @route   POST /api/pass_documents
// @desc    Uploads an offline digital e-Pass document
// @access  Private
router.post(
  '/',
  [authMiddleware, body('document_type', 'Document type is required').not().isEmpty()],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const document = await passDocumentController.uploadDocument(req.body.document_type, req.user?._id);
      res.json(document);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET /api/pass_documents
// @desc    Retrieves all e-Pass documents for a user
// @access  Private
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const documents = await passDocumentController.getUserDocuments(req.user?._id);
    res.json(documents);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

export default router;