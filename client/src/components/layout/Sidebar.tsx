import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-home" },
    { name: "My Surveys", href: "/surveys", icon: "fas fa-list-ul" },
    { name: "Responses", href: "/responses", icon: "fas fa-chart-bar" },
    { name: "Recipients", href: "/recipients", icon: "fas fa-users" },
    { name: "Analytics", href: "/analytics", icon: "fas fa-analytics" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo and Brand */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-poll text-primary-foreground text-sm"></i>
          </div>
          <span className="text-xl font-bold text-foreground">SurveyPro</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <a 
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className="font-medium">{item.name}</span>
            </a>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt="User profile" 
              className="w-10 h-10 rounded-full object-cover" 
              data-testid="img-user-avatar"
            />
          ) : (
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-primary"></i>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <i className="fas fa-user-circle text-primary text-sm"></i>
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
                {user?.firstName || user?.lastName 
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : user?.email || "User"
                }
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate ml-6" data-testid="text-user-email">
              {user?.email || ""}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
            className="flex items-center space-x-2 px-3 py-1"
          >
            <i className="fas fa-sign-out-alt text-sm"></i>
            <span className="text-xs">Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
