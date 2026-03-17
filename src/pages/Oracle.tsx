import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/Card";

export default function Oracle() {
  useAuth();

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome banner */}
        <div className="mb-8">
          <h2 className="text-roman-gold font-serif text-3xl font-bold">
            Sibyl — The Oracle
          </h2>
          <p className="text-stone-400 mt-1">
            Divine the performance of your legions and chart their paths to greatness.
          </p>
        </div>

        {/* Placeholder content */}
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🔮</div>
          <h3 className="text-roman-gold font-semibold text-xl mb-2">
            The Oracle Awaits
          </h3>
          <p className="text-stone-400">
            Comprehensive student progress analytics and predictions coming soon.
          </p>
        </Card>
      </div>
    </div>
  );
}
