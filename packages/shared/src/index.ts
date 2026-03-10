// --- Types ---

export interface PurchaseRequest {
  username: string;
  userId: string;
  price: number;
}

export interface PurchaseMessage extends PurchaseRequest {
  timestamp: string;
}

export interface PurchaseDocument extends PurchaseMessage {
  createdAt: Date;
}

// --- Constants ---

export const KAFKA_TOPIC = "purchases";
export const KAFKA_CONSUMER_GROUP = "customer-management-group";
export const MONGO_DB = "aura";
export const MONGO_COLLECTION = "purchases";
