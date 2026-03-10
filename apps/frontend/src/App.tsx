import { BuyForm } from "@/components/BuyForm";
import { PurchaseList } from "@/components/PurchaseList";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h1 className="text-3xl font-bold text-center">Aura Purchase System</h1>
        <BuyForm />
        <PurchaseList />
      </div>
    </div>
  );
}
