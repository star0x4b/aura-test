import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

const API_BASE = import.meta.env.VITE_API_BASE || "";

interface Purchase {
  username: string;
  userId: string;
  price: number;
  timestamp: string;
  createdAt: string;
}

export function PurchaseList() {
  const [userId, setUserId] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/purchases/${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (res.ok) {
        setPurchases(data.purchases || []);
      } else {
        setError(data.error || "Failed to fetch purchases");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleFetch} className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="lookupUserId">User ID</Label>
            <Input
              id="lookupUserId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-123"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Get All Purchases"}
          </Button>
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {purchases.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.username}</TableCell>
                  <TableCell>${p.price.toFixed(2)}</TableCell>
                  <TableCell>{new Date(p.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {purchases.length === 0 && !loading && !error && userId && (
          <p className="text-sm text-muted-foreground">No purchases found.</p>
        )}
      </CardContent>
    </Card>
  );
}
