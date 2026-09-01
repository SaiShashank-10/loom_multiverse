import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './productModel';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  order_id: number;

  @ManyToOne(type => Product, product => product.orders)
  product: Product;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', default: 'Pending' })
  status: string;
}