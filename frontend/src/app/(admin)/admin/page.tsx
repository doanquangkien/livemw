export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 tracking-tight">Bảng điều khiển</h1>
      <p className="text-gray-400 text-sm mb-8">
        Chào mừng đến với trung tâm điều khiển LiveMecwish.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card: Live Control */}
        <a
          href="/admin/live"
          className="block p-6 bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-base font-semibold">Điều khiển Live</h2>
          </div>
          <p className="text-sm text-gray-500">
            Giám sát phiên live, kiểm soát bình luận và quản lý danh sách đen.
          </p>
        </a>

        {/* Card: Upcoming features */}
        <div className="p-6 bg-gray-900/50 border border-gray-800/50 opacity-50 cursor-not-allowed">
          <h2 className="text-base font-semibold mb-2">Lịch phát sóng</h2>
          <p className="text-sm text-gray-500">
            Tính năng đang phát triển (Phase 5).
          </p>
        </div>

        <div className="p-6 bg-gray-900/50 border border-gray-800/50 opacity-50 cursor-not-allowed">
          <h2 className="text-base font-semibold mb-2">Thống kê</h2>
          <p className="text-sm text-gray-500">
            Tính năng đang phát triển.
          </p>
        </div>
      </div>
    </div>
  );
}
