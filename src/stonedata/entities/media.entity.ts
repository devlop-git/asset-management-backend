import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Stonedata } from './stonedata.entity';

@Entity({ name: 'media' })
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Stonedata)
  @JoinColumn({ name: 'stone_id' })
  stonedata: Stonedata;

  @Column({ type: 'varchar', length: 255 })
  image_url: string;

  @Column({ type: 'boolean' ,default: false})
  is_image_original: boolean=false;

  @Column({ type: 'varchar', length: 255 })
  video_url: string;

  @Column({ type: 'boolean',default: false })
  is_video_original: boolean=false;

  @Column({ type: 'varchar', length: 255 })
  cert_url: string;

  @Column({ type: 'boolean',default: true })
  is_certified_stone: boolean=true;

  @Column({ type: 'boolean',default: false })
  is_manual_upload: boolean=false;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'boolean',default: true })
  is_active: boolean=true;
}
