import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import logo from "@/assets/images/logo.jpg";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await apiRequest('POST', '/api/auth/logout');

      // Invalidate auth queries
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout Error',
        description: 'There was an error signing out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-home" },
    { name: "My Surveys", href: "/surveys", icon: "fas fa-list-ul" },
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
    <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col" data-testid="sidebar">
      {/* Logo and Brand */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="Poll Vault Logo"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="text-lg sm:text-xl font-bold text-foreground">Poll Vault</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <div
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className="font-medium text-sm sm:text-base">{item.name}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 sm:p-4 border-t border-border">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="User profile"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                data-testid="img-user-avatar"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
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
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center justify-center space-x-2 h-9"
          >
            <i className="fas fa-sign-out-alt text-sm"></i>
            <span className="text-xs sm:text-sm">Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
