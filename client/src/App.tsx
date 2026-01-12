import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { Activity } from "lucide-react";
import bannerBg from "@assets/banner-bg.png";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div 
          className="flex flex-col h-screen"
          style={{
            backgroundImage: `url(${bannerBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <header 
            className="h-16 flex items-center justify-between px-6 flex-shrink-0"
            style={{
              backgroundImage: `url(${bannerBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-white/90 flex items-center justify-center shadow-sm">
                <Activity className="h-5 w-5 text-gray-800" />
              </div>
              <h1 className="font-semibold text-xl text-white drop-shadow-md">Plexus Clinical</h1>
            </div>
            <div className="bg-white/90 rounded-md shadow-sm">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-hidden p-4">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
