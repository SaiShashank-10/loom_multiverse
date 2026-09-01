import { Supplier } from '../models/Supplier';

export class SupplierService {
  private suppliers: Supplier[] = [
    { id: 1, name: 'TechGiant Suppliers', location: 'San Francisco, CA' },
    { id: 2, name: 'Global Gadgets', location: 'Shenzhen, China' }
  ];

  public async getAllSuppliers(): Promise<Supplier[]> {
    return this.suppliers;
  }

  public async getSupplierById(id: number): Promise<Supplier | null> {
    return this.suppliers.find(s => s.id === id) || null;
  }

  public async addSupplier(name: string, location: string): Promise<Supplier> {
    const newSupplier = { id: Date.now(), name, location };
    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  public async updateSupplier(id: number, name: string, location: string): Promise<Supplier | null> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.suppliers[index] = { id, name, location };
    return this.suppliers[index];
  }

  public async deleteSupplier(id: number): Promise<Supplier | null> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    const deleted = this.suppliers[index];
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    return deleted;
  }
}