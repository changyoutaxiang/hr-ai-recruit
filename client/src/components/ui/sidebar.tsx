import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Calendar, 
  Bot, 
  BarChart3, 
  TrendingUp,
  Settings,
  FileText
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Job Postings", href: "/jobs", icon: Briefcase },
  { name: "Interviews", href: "/interviews", icon: Calendar },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
];

const analytics = [
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Funnel Analysis", href: "/funnel", icon: TrendingUp },
];

const settings = [
  { name: "Preferences", href: "/preferences", icon: Settings },
  { name: "Templates", href: "/templates", icon: FileText },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className={cn("flex h-full w-60 flex-col bg-card border-r border-border", className)}>
      {/* Logo and Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Recruit</h1>
            <p className="text-xs text-muted-foreground">Smart Hiring Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
                {item.name === "Candidates" && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    24
                  </span>
                )}
                {item.name === "Job Postings" && (
                  <span className="ml-auto bg-chart-2 text-white text-xs px-2 py-0.5 rounded-full">
                    8
                  </span>
                )}
                {item.name === "Interviews" && (
                  <span className="ml-auto bg-chart-3 text-white text-xs px-2 py-0.5 rounded-full">
                    12
                  </span>
                )}
                {item.name === "AI Assistant" && (
                  <span className="ml-auto w-2 h-2 bg-chart-2 rounded-full"></span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Analytics
          </h3>
          <nav className="mt-2 space-y-1">
            {analytics.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </h3>
          <nav className="mt-2 space-y-1">
            {settings.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </a>
            ))}
          </nav>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">SC</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Sarah Chen</p>
            <p className="text-xs text-muted-foreground truncate">HR Manager</p>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
