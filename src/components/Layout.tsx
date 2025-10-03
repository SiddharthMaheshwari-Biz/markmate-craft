import { Outlet, Link, useLocation } from "react-router-dom";
import { Sparkles, Image, Settings, History } from "lucide-react";

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { icon: Sparkles, label: "Create", path: "/" },
    { icon: History, label: "Gallery", path: "/gallery" },
    { icon: Settings, label: "Brand", path: "/brand" },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col p-6 z-50">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MarkMate
          </h1>
          <p className="text-xs text-muted-foreground mt-1">AI Content Creator</p>
        </div>
        
        <div className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Main Content Offset */}
      <div className="hidden md:block md:ml-64" />
    </div>
  );
};

export default Layout;
