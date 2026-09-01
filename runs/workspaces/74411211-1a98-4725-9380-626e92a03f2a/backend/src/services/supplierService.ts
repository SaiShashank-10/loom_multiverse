import { Supplier } from '../models/supplierModel';
import { dbClient } from '../config/database';

class SupplierService {
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const result = await dbClient.query('SELECT * FROM Suppliers');
      return result.rows;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }
  }

  async addSupplier(name: string, location?: string): Promise<Supplier> {
    try {
      const result = await dbClient.query(
        'INSERT INTO Suppliers (name, location) VALUES ($1, $2) RETURNING *',
        [name, location]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw new Error('Failed to add supplier');
    }
  }

  async getSupplierById(supplierId: number): Promise<Supplier | null> {
    try {
      const result = await dbClient.query(
        'SELECT * FROM Suppliers WHERE supplier_id = $1',
        [supplierId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw new Error('Failed to fetch supplier by ID');
    }
  }

  async updateSupplier(supplierId: number, name?: string, location?: string): Promise<Supplier> {
    try {
      const setClause = [];
      if (name) setClause.push(`name = '${name}'`);
      if (location) setClause.push(`location = '${location}'`);

      const query = `UPDATE Suppliers SET ${setClause.join(', ')} WHERE supplier_id = $1 RETURNING *`;
      const result = await dbClient.query(query, [supplierId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error('Failed to update supplier');
    }
  }

  async deleteSupplier(supplierId: number): Promise<void> {
    try {
      await dbClient.query('DELETE FROM Suppliers WHERE supplier_id = $1', [supplierId]);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw new Error('Failed to delete supplier');
    }
  }
}

export default new SupplierService();