import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function BuyForm() {
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_BASE}/api/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, userId, price: parseFloat(price) }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Purchase submitted successfully!");
        setUsername("");
        setUserId("");
        setPrice("");
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Purchase</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="john_doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-123"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29.99"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Buy"}
          </Button>
          {status && (
            <p className={`text-sm ${status.startsWith("Error") || status.startsWith("Failed") ? "text-red-500" : "text-green-600"}`}>
              {status}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
