import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Stock } from './stock.entity';
import { Media } from './media.entity';

@Entity({ name: 'stonedata' })
export class Stonedata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  certificate_no: string;

  @Column({ type: 'varchar', length: 100 })
  shape: string;

  @Column({ type: 'varchar', length: 100 })
  measurement: string;

  @Column({ type: 'varchar', length: 100 })
  color: string;

  @Column({ type: 'varchar', length: 100 })
  clarity: string;

  @Column({ type: 'varchar', length: 100 })
  cut: string;

  @Column({ type: 'float' })
  depth: number;

  @Column({ type: 'varchar', length: 100 })
  polish: string;

  @Column({ type: 'varchar', length: 100 })
  symmetry: string;

  @Column({ type: 'varchar', length: 100 })
  fluorescence: string;

  @Column({ type: 'varchar', length: 100 })
  girdle: string;

  @Column({ type: 'varchar', length: 100 })
  table: string;

  @Column({ type: 'varchar', length: 100 })
  lab: string;

  @Column({ type: 'varchar', length: 100 })
  stone_type: string;

  @Column({ type: 'varchar', length: 100 })
  tag_no: string;

  @Column({ type: 'float' })
  carat: number;

  @Column({ type: 'varchar', length: 100 })
  intensity: string;

  @OneToOne(() => Stock, stock => stock.stonedata)
  @JoinColumn({ name: 'certificate_no', referencedColumnName: 'certificate_no' })
  stock: Stock;

  @OneToMany(() => Media, media => media.stonedata)
  media: Media[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
