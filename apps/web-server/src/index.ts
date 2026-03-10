/**
 * Customer-Facing Web Server
 *
 * This service is the public API gateway. It handles two operations:
 * 1. POST /api/buy — Accepts a purchase request, enriches it with a timestamp,
 *    and publishes it to Kafka for async processing. Returns 202 (Accepted)
 *    because the purchase is not yet persisted — that happens in customer-management.
 * 2. GET /api/purchases/:userId — Proxies the request to the customer-management
 *    service which owns the MongoDB data layer.
 *
 * This separation means the web-server has no direct DB dependency, making it
 * lightweight and independently scalable.
 */
import express, { Request, Response } from "express";
import { Kafka, Producer } from "kafkajs";
import { PurchaseRequest, PurchaseMessage, KAFKA_TOPIC } from "@aura/shared";

const PORT = parseInt(process.env.PORT || "3000", 10);
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const CUSTOMER_MANAGEMENT_URL =
  process.env.CUSTOMER_MANAGEMENT_URL || "http://localhost:3001";

const kafka = new Kafka({ clientId: "web-server", brokers: KAFKA_BROKERS });
let producer: Producer;

const app = express();
app.use(express.json());

app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/readyz", (_req, res) => {
  if (producer) return res.send("ok");
  res.status(503).send("not ready");
});

// Accept a purchase, publish to Kafka, and return 202.
// The purchase will be persisted asynchronously by the customer-management consumer.
app.post("/api/buy", async (req: Request, res: Response) => {
  const { username, userId, price } = req.body as PurchaseRequest;

  if (!username || !userId || price == null || typeof price !== "number" || price <= 0) {
    return res.status(400).json({ error: "Invalid request. Provide username, userId, and a positive price." });
  }

  const message: PurchaseMessage = {
    username,
    userId,
    price,
    timestamp: new Date().toISOString(),
  };

  try {
    // Use userId as the Kafka message key to ensure all purchases from the same
    // user land on the same partition, preserving per-user ordering.
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ key: userId, value: JSON.stringify(message) }],
    });
    res.status(202).json({ status: "accepted", message });
  } catch (err) {
    console.error("Failed to publish to Kafka:", err);
    res.status(500).json({ error: "Failed to process purchase" });
  }
});

// Proxy read requests to customer-management, which owns the data layer.
app.get("/api/purchases/:userId", async (req: Request, res: Response) => {
  try {
    const upstream = `${CUSTOMER_MANAGEMENT_URL}/api/purchases/${req.params.userId}`;
    const response = await fetch(upstream);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Failed to proxy to customer-management:", err);
    res.status(502).json({ error: "Upstream service unavailable" });
  }
});

async function start() {
  producer = kafka.producer();
  await producer.connect();
  console.log("Kafka producer connected");

  app.listen(PORT, () => console.log(`web-server listening on :${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start web-server:", err);
  process.exit(1);
});
