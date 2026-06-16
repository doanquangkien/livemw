import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - LiveMecwish",
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/live", label: "Live Control" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <span className="text-sm font-semibold tracking-wide">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            View Site →
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
