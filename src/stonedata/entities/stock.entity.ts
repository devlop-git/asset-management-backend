import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  stock: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tag_no: string;

 @Column({ type: 'varchar', length: 100 })
  orderid: string;

  @Column({ type: 'varchar', length: 100 })
  status: string;

  @Column({ type: 'varchar', length: 100 })
  certificate_no: string;

  @Column({ type: 'timestamp' })
  order_received_date: Date;

  @Column({ type: 'timestamp' })
  diamond_received_date: Date;

  @Column({ type: 'varchar', length: 100 })
  purity_name: string;

  @Column({ type: 'float8' })
  avg_weight: number;

  @Column()
  pieces: number;

  @Column({ type: 'varchar', length: 100 })
  stone_type: string;

  @Column({ type: 'varchar', length: 100 })
  lab: string;

  @Column({ type: 'varchar', length: 100 })
  supplier: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_supplier: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_vendor: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_cert: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_shape: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_color: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_clarity: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_carat: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_cut: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_polish: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_symmetry: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_fluorescence: string;

  @Column({ type: 'varchar', length: 100 })
  dfr_measurement: string;

  @Column({ type: 'boolean' })
  is_certified_stone: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'boolean' })
  is_active: boolean;
}
