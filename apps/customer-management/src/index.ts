import express, { Request, Response } from "express";
import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { MongoClient, Collection } from "mongodb";
import {
  PurchaseMessage,
  PurchaseDocument,
  KAFKA_TOPIC,
  KAFKA_CONSUMER_GROUP,
  MONGO_DB,
  MONGO_COLLECTION,
} from "@aura/shared";

const PORT = parseInt(process.env.PORT || "3001", 10);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

const kafka = new Kafka({ clientId: "customer-management", brokers: KAFKA_BROKERS });
let consumer: Consumer;
let collection: Collection<PurchaseDocument>;
let ready = false;

const app = express();
app.use(express.json());

// --- Health checks ---
app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/readyz", (_req, res) => {
  if (ready) return res.send("ok");
  res.status(503).send("not ready");
});

// --- GET /api/purchases/:userId ---
app.get("/api/purchases/:userId", async (req: Request, res: Response) => {
  try {
    const purchases = await collection
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ userId: req.params.userId, purchases });
  } catch (err) {
    console.error("Failed to query purchases:", err);
    res.status(500).json({ error: "Failed to query purchases" });
  }
});

// --- Kafka message handler ---
async function handleMessage({ message }: EachMessagePayload) {
  if (!message.value) return;

  const purchase: PurchaseMessage = JSON.parse(message.value.toString());
  const doc: PurchaseDocument = { ...purchase, createdAt: new Date() };

  await collection.insertOne(doc);
  console.log(`Stored purchase for userId=${purchase.userId}`);
}

// --- Start ---
async function start() {
  // Connect to MongoDB and create index
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  console.log("Connected to MongoDB");

  collection = mongo.db(MONGO_DB).collection<PurchaseDocument>(MONGO_COLLECTION);
  await collection.createIndex({ userId: 1 });

  // Start Kafka consumer
  consumer = kafka.consumer({ groupId: KAFKA_CONSUMER_GROUP });
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
  await consumer.run({ eachMessage: handleMessage });
  console.log("Kafka consumer running");

  ready = true;

  app.listen(PORT, () => console.log(`customer-management listening on :${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start customer-management:", err);
  process.exit(1);
});
