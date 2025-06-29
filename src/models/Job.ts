import mongoose, { Document, Schema } from 'mongoose';

export interface JobDocument extends Document {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<JobDocument>({
  jobId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], required: true },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
  progress: { type: Number, default: 0 },
}, { timestamps: true });

export const Job = mongoose.model<JobDocument>('Job', JobSchema); 