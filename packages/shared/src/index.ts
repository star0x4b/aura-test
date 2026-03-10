// Shared types and constants used by both web-server and customer-management.
// Kept in a separate package to ensure consistent message contracts across services.

// What the client sends to POST /api/buy
export interface PurchaseRequest {
  username: string;
  userId: string;
  price: number;
}

// What gets published to Kafka (request + server-generated timestamp)
export interface PurchaseMessage extends PurchaseRequest {
  timestamp: string;
}

// What gets stored in MongoDB (message + insertion timestamp)
export interface PurchaseDocument extends PurchaseMessage {
  createdAt: Date;
}

export const KAFKA_TOPIC = "purchases";
export const KAFKA_CONSUMER_GROUP = "customer-management-group";
export const MONGO_DB = "aura";
export const MONGO_COLLECTION = "purchases";
