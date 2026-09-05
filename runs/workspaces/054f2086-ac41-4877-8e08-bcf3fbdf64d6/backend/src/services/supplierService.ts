import { Supplier } from '../models/supplierModel';
import { dbClient } from '../database/dbClient';

export class SupplierService {
  public async getSuppliers(): Promise<Supplier[]> {
    try {
      const result = await dbClient.query('SELECT * FROM suppliers');
      return result.rows;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }
  }

  public async addSupplier(name: string, location?: string): Promise<Supplier> {
    try {
      const result = await dbClient.query(
        'INSERT INTO suppliers (name, location) VALUES ($1, $2) RETURNING *',
        [name, location]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw new Error('Failed to add supplier');
    }
  }

  public async getSupplierById(id: number): Promise<Supplier | null> {
    try {
      const result = await dbClient.query('SELECT * FROM suppliers WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw new Error('Failed to fetch supplier by ID');
    }
  }

  public async updateSupplier(id: number, name?: string, location?: string): Promise<Supplier> {
    try {
      const setClause = [];
      const values = [];

      if (name) {
        setClause.push(`name = $${values.length + 1}`);
        values.push(name);
      }
      if (location) {
        setClause.push(`location = $${values.length + 1}`);
        values.push(location);
      }

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `UPDATE suppliers SET ${setClause.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
      values.push(id);

      const result = await dbClient.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error('Failed to update supplier');
    }
  }

  public async deleteSupplier(id: number): Promise<void> {
    try {
      await dbClient.query('DELETE FROM suppliers WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw new Error('Failed to delete supplier');
    }
  }
}