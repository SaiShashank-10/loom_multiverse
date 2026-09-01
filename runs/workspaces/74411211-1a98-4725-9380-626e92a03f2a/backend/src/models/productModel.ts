import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Supplier } from './supplierModel';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  product_id: number;

  @ManyToOne(() => Supplier, supplier => supplier.products)
  supplier: Supplier;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: false })
  price: number;
}