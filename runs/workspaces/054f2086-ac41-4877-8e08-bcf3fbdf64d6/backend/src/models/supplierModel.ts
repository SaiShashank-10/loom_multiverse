import { PoolClient } from 'pg';

interface Supplier {
  id: number;
  name: string;
  location?: string;
}

class SupplierModel {
  private client: PoolClient;

  constructor(client: PoolClient) {
    this.client = client;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const result = await this.client.query('SELECT * FROM suppliers');
      return result.rows as Supplier[];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }
  }

  async addSupplier(name: string, location?: string): Promise<Supplier> {
    try {
      const result = await this.client.query(
        'INSERT INTO suppliers (name, location) VALUES ($1, $2) RETURNING *',
        [name, location]
      );
      return result.rows[0] as Supplier;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw new Error('Failed to add supplier');
    }
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    try {
      const result = await this.client.query(
        'SELECT * FROM suppliers WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? (result.rows[0] as Supplier) : null;
    } catch (error) {
      console.error('Error fetching supplier by ID:', error);
      throw new Error('Failed to fetch supplier by ID');
    }
  }

  async updateSupplier(id: number, name?: string, location?: string): Promise<Supplier> {
    try {
      const result = await this.client.query(
        'UPDATE suppliers SET name = $1, location = $2 WHERE id = $3 RETURNING *',
        [name, location, id]
      );
      return result.rows[0] as Supplier;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error('Failed to update supplier');
    }
  }

  async deleteSupplier(id: number): Promise<void> {
    try {
      await this.client.query('DELETE FROM suppliers WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw new Error('Failed to delete supplier');
    }
  }
}

export default SupplierModel;