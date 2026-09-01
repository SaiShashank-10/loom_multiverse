import { Request, Response } from 'express';
import { SupplierService } from '../services/supplierService';

const supplierService = new SupplierService();

class SupplierController {
  async getSuppliers(req: Request, res: Response) {
    try {
      const suppliers = await supplierService.getAllSuppliers();
      res.status(200).json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async addSupplier(req: Request, res: Response) {
    try {
      const { name, location } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: 'Name and location are required' });
      }
      const supplier = await supplierService.addSupplier(name, location);
      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error adding supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateSupplier(req: Request, res: Response) {
    try {
      const { name, location } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: 'Name and location are required' });
      }
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: 'Invalid supplier ID' });
      }
      const updatedSupplier = await supplierService.updateSupplier(supplierId, name, location);
      if (!updatedSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.status(200).json(updatedSupplier);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteSupplier(req: Request, res: Response) {
    try {
      const supplierId = parseInt(req.params.id);
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: 'Invalid supplier ID' });
      }
      const deletedSupplier = await supplierService.deleteSupplier(supplierId);
      if (!deletedSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      res.status(200).json(deletedSupplier);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default SupplierController;