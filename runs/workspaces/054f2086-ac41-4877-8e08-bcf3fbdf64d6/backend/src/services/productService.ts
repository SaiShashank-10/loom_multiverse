import { Product } from '../models/productModel';
import { Supplier } from '../models/supplierModel';

export class ProductService {
  async getAllProducts(): Promise<Product[]> {
    try {
      const products = await Product.findAll({
        include: [Supplier],
      });
      return products;
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async addProduct(productData: Partial<Product>): Promise<Product> {
    try {
      const product = await Product.create(productData, { include: [Supplier] });
      return product;
    } catch (error) {
      console.error('Error adding product:', error);
      throw new Error('Failed to add product');
    }
  }

  async getProductById(productId: number): Promise<Product | null> {
    try {
      const product = await Product.findByPk(productId, { include: [Supplier] });
      return product;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw new Error('Failed to fetch product');
    }
  }

  async updateProduct(productId: number, productData: Partial<Product>): Promise<Product> {
    try {
      const [updatedRows] = await Product.update(productData, { where: { id: productId } });
      if (updatedRows === 0) {
        throw new Error('No product found with the given ID');
      }
      return this.getProductById(productId);
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(productId: number): Promise<void> {
    try {
      const deletedRows = await Product.destroy({ where: { id: productId } });
      if (deletedRows === 0) {
        throw new Error('No product found with the given ID');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }
}