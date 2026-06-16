import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - LiveMecwish",
};

const navItems = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/live", label: "Điều khiển Live" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-950 text-white overflow-hidden">
      {/* Sidebar / Topnav */}
      <aside className="w-full md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-gray-800 flex flex-row md:flex-col overflow-x-auto">
        <div className="px-4 py-3 md:py-4 md:border-b border-gray-800 flex items-center shrink-0">
          <span className="text-sm font-semibold tracking-wide">Quản trị</span>
        </div>
        <nav className="flex-1 px-2 flex flex-row md:flex-col md:p-3 space-x-1 md:space-x-0 md:space-y-1 items-center md:items-stretch overflow-x-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-md shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800 hidden md:block shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Xem trang →
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
