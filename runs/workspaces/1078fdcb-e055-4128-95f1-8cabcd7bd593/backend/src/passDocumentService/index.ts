import express from 'express';
import { body, validationResult } from 'express-validator';
import * as passDocumentService from '../services';

const router = express.Router();

// POST /pass_documents - Uploads an offline digital e-Pass document
router.post(
  '/',
  [
    body('document_type').not().isEmpty().withMessage('Document type is required'),
    body('user_id').not().isEmpty().withMessage('User ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { document_type, user_id } = req.body;
      const passDocument = await passDocumentService.uploadPassDocument(document_type, user_id);

      res.status(201).json(passDocument);
    } catch (error) {
      console.error('Error uploading pass document:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// GET /pass_documents - Retrieves all e-Pass documents for a user
router.get(
  '/',
  async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const passDocuments = await passDocumentService.getPassDocumentsByUserId(user_id as string);

      res.json(passDocuments);
    } catch (error) {
      console.error('Error retrieving pass documents:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;