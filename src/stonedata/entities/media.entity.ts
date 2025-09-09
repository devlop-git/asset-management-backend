import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, Unique } from 'typeorm';
import { Stonedata } from './stonedata.entity';

@Entity({ name: 'media' })
@Unique(['stonedata'])
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Stonedata)
  @JoinColumn({ name: 'stone_id' })
  stonedata: Stonedata;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ type: 'boolean', nullable: false })
  is_image_original: boolean;

  @Column({ type: 'text', nullable: true })
  video_url: string | null;

  @Column({ type: 'boolean', nullable: false })
  is_video_original: boolean;

  @Column({ type: 'text', nullable: true })
  cert_url: string | null;

  @Column({ type: 'boolean', nullable: false })
  is_certified_stone: boolean;

  @Column({ type: 'boolean', nullable: false })
  is_manual_upload: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: false })
  updated_at: Date;

  @Column({ type: 'boolean', nullable: true })
  is_active: boolean | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdf_url: string | null;
}
