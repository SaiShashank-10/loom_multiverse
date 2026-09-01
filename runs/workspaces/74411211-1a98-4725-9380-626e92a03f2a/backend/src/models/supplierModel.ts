import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Supplier {
  @PrimaryGeneratedColumn()
  supplier_id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;
}