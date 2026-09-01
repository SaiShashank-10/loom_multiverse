import { Product } from '../models/productModel';
import { Supplier } from '../models/supplierModel';
import { dbClient } from '../config/database';

export class ProductService {
  async getAllProducts(): Promise<Product[]> {
    try {
      const products = await dbClient.query('SELECT * FROM Products');
      return products.rows;
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async addProduct(product: Product): Promise<Product> {
    try {
      const { name, price, supplier_id } = product;
      const result = await dbClient.query(
        'INSERT INTO Products (name, price, supplier_id) VALUES ($1, $2, $3) RETURNING *',
        [name, price, supplier_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error adding product:', error);
      throw new Error('Failed to add product');
    }
  }

  async getProductById(productId: number): Promise<Product> {
    try {
      const result = await dbClient.query('SELECT * FROM Products WHERE product_id = $1', [productId]);
      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw new Error('Failed to fetch product');
    }
  }

  async updateProduct(productId: number, updatedProduct: Partial<Product>): Promise<Product> {
    try {
      const { name, price, supplier_id } = updatedProduct;
      const setClause = [];
      if (name) setClause.push(`name = '${name}'`);
      if (price) setClause.push(`price = ${price}`);
      if (supplier_id) setClause.push(`supplier_id = ${supplier_id}`);

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `UPDATE Products SET ${setClause.join(', ')} WHERE product_id = $1 RETURNING *`;
      const result = await dbClient.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(productId: number): Promise<void> {
    try {
      const result = await dbClient.query('DELETE FROM Products WHERE product_id = $1', [productId]);
      if (result.rowCount === 0) {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  async getProductsBySupplier(supplierId: number): Promise<Product[]> {
    try {
      const products = await dbClient.query(
        'SELECT * FROM Products WHERE supplier_id = $1',
        [supplierId]
      );
      return products.rows;
    } catch (error) {
      console.error('Error fetching products by supplier:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async getProductByName(name: string): Promise<Product[]> {
    try {
      const products = await dbClient.query(
        'SELECT * FROM Products WHERE name LIKE $1',
        [`%${name}%`]
      );
      return products.rows;
    } catch (error) {
      console.error('Error fetching product by name:', error);
      throw new Error('Failed to fetch product');
    }
  }

  async getProductByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    try {
      const products = await dbClient.query(
        'SELECT * FROM Products WHERE price BETWEEN $1 AND $2',
        [minPrice, maxPrice]
      );
      return products.rows;
    } catch (error) {
      console.error('Error fetching products by price range:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async getProductBySupplierName(supplierName: string): Promise<Product[]> {
    try {
      const supplier = await dbClient.query(
        'SELECT * FROM Suppliers WHERE name LIKE $1',
        [`%${supplierName}%`]
      );

      if (supplier.rows.length === 0) {
        throw new Error('Supplier not found');
      }

      const products = await dbClient.query(
        'SELECT * FROM Products WHERE supplier_id = $1',
        [supplier.rows[0].supplier_id]
      );
      return products.rows;
    } catch (error) {
      console.error('Error fetching products by supplier name:', error);
      throw new Error('Failed to fetch products');
    }
  }
}