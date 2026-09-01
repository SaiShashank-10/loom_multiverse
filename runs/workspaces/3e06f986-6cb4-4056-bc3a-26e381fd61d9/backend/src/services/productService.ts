import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';

class ProductService {
  private products: Product[] = [
    { id: 1, supplier: { id: 1, name: 'TechGiant', location: 'SF' }, name: 'Wireless Mouse', price: 29.99 },
    { id: 2, supplier: { id: 2, name: 'Global Gadgets', location: 'CN' }, name: 'Mechanical Keyboard', price: 89.99 }
  ];

  public async getAllProducts(): Promise<Product[]> {
    return this.products;
  }

  public async getProductById(id: string): Promise<Product | null> {
    const numId = parseInt(id);
    return this.products.find(p => p.id === numId) || null;
  }

  public async createProduct(name: string, supplier_id: string, price: string): Promise<Product> {
    const newProduct: Product = { 
      id: Date.now(), 
      supplier: { id: parseInt(supplier_id) || 1, name: 'Mock Supplier', location: 'Mock Location' },
      name: name || 'Unnamed', 
      price: parseFloat(price) || 0 
    };
    this.products.push(newProduct);
    return newProduct;
  }

  public async updateProduct(id: string, name: string, supplier_id: string, price: string): Promise<Product | null> {
    const numId = parseInt(id);
    const index = this.products.findIndex(p => p.id === numId);
    if (index === -1) return null;
    this.products[index] = { 
        ...this.products[index], 
        name, 
        price: parseFloat(price) || 0,
        supplier: { id: parseInt(supplier_id) || 1, name: 'Mock Supplier', location: 'Mock Location' }
    };
    return this.products[index];
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const numId = parseInt(id);
    const initialLength = this.products.length;
    this.products = this.products.filter(p => p.id !== numId);
    return this.products.length < initialLength;
  }
}

export default new ProductService();