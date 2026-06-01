import mongoose, { Schema, Document, Types } from 'mongoose';

interface IMessage {
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  email: string;
  category: 'Technical' | 'Billing' | 'General Inquiry' | 'Cancellation & Refund' | 'Trip Issue';
  message: string;
  status: 'Open' | 'In Progress' | 'Closed';
  adminReply?: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  sender:     { type: String, enum: ['user', 'admin'], required: true },
  senderName: { type: String, required: true },
  text:       { type: String, required: true, maxlength: 2000 },
  createdAt:  { type: Date, default: Date.now },
}, { _id: false });

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, trim: true, lowercase: true },
    category: {
      type: String,
      enum: ['Technical', 'Billing', 'General Inquiry', 'Cancellation & Refund', 'Trip Issue'],
      default: 'General Inquiry',
    },
    message:  { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Closed'],
      default: 'Open',
    },
    adminReply: { type: String, default: '' },
    messages:   { type: [messageSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['__v'];
        return ret;
      },
    },
  }
);

const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
export default SupportTicket;