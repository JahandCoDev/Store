import AdminShell from "@/components/AdminShell";

export default function Home() {
  return (
    <AdminShell title="Dashboard Overview">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-white">$0.00</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Orders</h3>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Active Products</h3>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Recent Orders</h3>
        </div>
        <div className="p-6 text-center text-gray-400">
          No recent orders found.
        </div>
      </div>
    </AdminShell>
  );
}
