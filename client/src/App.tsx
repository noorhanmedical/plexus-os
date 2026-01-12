import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CalendarView } from "@/pages/CalendarView";
import { PatientProfileView } from "@/pages/PatientProfileView";
import { BillingView } from "@/pages/BillingView";
import { FinanceView } from "@/pages/FinanceView";
import { Calendar, User, CreditCard, DollarSign, Activity } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type Tab = "calendar" | "patient" | "billing" | "finance";

const tabs = [
  { id: "calendar" as Tab, label: "Calendar", icon: Calendar },
  { id: "patient" as Tab, label: "Patient Profile", icon: User },
  { id: "billing" as Tab, label: "Billing", icon: CreditCard },
  { id: "finance" as Tab, label: "Finance", icon: DollarSign },
];

function AppSidebar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
            <Activity className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Plexus</h1>
            <p className="text-xs text-sidebar-foreground/70">Clinical EMR</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarMenu>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <SidebarMenuItem key={tab.id}>
                <SidebarMenuButton
                  data-testid={`nav-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  isActive={isActive}
                  tooltip={tab.label}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-sidebar-foreground/70">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return <CalendarView />;
      case "patient":
        return <PatientProfileView />;
      case "billing":
        return <BillingView />;
      case "finance":
        return <FinanceView />;
      default:
        return <CalendarView />;
    }
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            
            <main className="flex-1 flex flex-col overflow-hidden">
              <header className="h-16 bg-primary px-6 flex items-center justify-between border-b border-primary-border">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-primary-foreground" data-testid="button-sidebar-toggle" />
                  <h2 className="text-xl font-semibold text-primary-foreground">
                    {tabs.find((t) => t.id === activeTab)?.label}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-foreground/80">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-6 bg-background">
                {renderContent()}
              </div>
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
