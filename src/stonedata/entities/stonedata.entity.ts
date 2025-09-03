import { Entity, Column, PrimaryGeneratedColumn} from 'typeorm';

@Entity({ name: 'stonedata' })
export class Stonedata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  certficate_no: string;

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


  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'boolean' })
  is_active: boolean;
}
