import { DocumentType } from '../models/document';
import { PassDocumentRepository } from '../repositories/passDocumentRepository';

export class PassDocumentService {
  private passDocumentRepository: PassDocumentRepository;

  constructor(passDocumentRepository: PassDocumentRepository) {
    this.passDocumentRepository = passDocumentRepository;
  }

  async uploadPassDocument(userId: string, documentType: DocumentType): Promise<void> {
    try {
      await this.passDocumentRepository.create(userId, documentType);
    } catch (error) {
      throw new Error(`Failed to upload e-Pass document for user ${userId}: ${error.message}`);
    }
  }

  async getPassDocumentsByUser(userId: string): Promise<DocumentType[]> {
    try {
      return await this.passDocumentRepository.findByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to retrieve e-Pass documents for user ${userId}: ${error.message}`);
    }
  }
}