import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HomeDashboard } from "@/pages/HomeDashboard";
import { PatientSearchView } from "@/pages/PatientSearchView";
import { PrescreensView } from "@/pages/PrescreensView";
import { AncillaryDashboard } from "@/pages/AncillaryDashboard";
import { BillingView } from "@/pages/BillingView";
import { FinanceView } from "@/pages/FinanceView";
import { Home, User, ClipboardList, Activity, CreditCard, DollarSign, Sparkles } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type MainTab = "home" | "prescreens" | "ancillary" | "finance";
type SidebarTab = "patient" | "billing";

const mainTabs = [
  { id: "home" as MainTab, label: "Home", icon: Home },
  { id: "prescreens" as MainTab, label: "Prescreens", icon: ClipboardList },
  { id: "ancillary" as MainTab, label: "Ancillary", icon: Activity },
  { id: "finance" as MainTab, label: "Finance", icon: DollarSign },
];

const sidebarTabs = [
  { id: "patient" as SidebarTab, label: "Patient Search", icon: User },
  { id: "billing" as SidebarTab, label: "Billing", icon: CreditCard },
];

function AppSidebar({ 
  activeTab, 
  onTabChange,
  onClearSidebar 
}: { 
  activeTab: SidebarTab | null; 
  onTabChange: (tab: SidebarTab) => void;
  onClearSidebar: () => void;
}) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <button
          onClick={onClearSidebar}
          className="flex items-center gap-3 w-full text-left hover-elevate rounded-lg p-1 -m-1"
          data-testid="nav-home-logo"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center star-glow">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg glow-text">Plexus</h1>
            <p className="text-xs text-sidebar-foreground/70">Clinical EMR</p>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarMenu>
          {sidebarTabs.map((tab) => {
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
    </Sidebar>
  );
}

function App() {
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);

  const handleSidebarTabChange = (tab: SidebarTab) => {
    setSidebarTab(sidebarTab === tab ? null : tab);
  };

  const handleMainTabChange = (tab: MainTab) => {
    setMainTab(tab);
    setSidebarTab(null);
  };

  const handleClearSidebar = () => {
    setSidebarTab(null);
    setMainTab("home");
  };

  const renderContent = () => {
    if (sidebarTab === "patient") {
      return <PatientSearchView />;
    }
    if (sidebarTab === "billing") {
      return <BillingView />;
    }

    switch (mainTab) {
      case "home":
        return <HomeDashboard />;
      case "prescreens":
        return <PrescreensView />;
      case "ancillary":
        return <AncillaryDashboard />;
      case "finance":
        return <FinanceView />;
      default:
        return <HomeDashboard />;
    }
  };

  const getCurrentTitle = () => {
    if (sidebarTab === "patient") return "Patient Search";
    if (sidebarTab === "billing") return "Billing";
    return mainTabs.find((t) => t.id === mainTab)?.label || "Home";
  };

  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar activeTab={sidebarTab} onTabChange={handleSidebarTabChange} onClearSidebar={handleClearSidebar} />
            
            <main className="flex-1 flex flex-col overflow-hidden">
              <header className="h-14 px-4 flex items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar starfield">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-sidebar-foreground" data-testid="button-sidebar-toggle" />
                  <h2 className="text-lg font-semibold text-sidebar-foreground glow-text">
                    {getCurrentTitle()}
                  </h2>
                </div>
                
                <div className="flex items-center gap-1 p-1 rounded-lg bg-sidebar-accent/50">
                  {mainTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = !sidebarTab && mainTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        data-testid={`tab-${tab.id}`}
                        onClick={() => handleMainTabChange(tab.id)}
                        className={`gap-2 ${!isActive ? "text-sidebar-foreground hover:text-sidebar-foreground" : ""}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="text-sm text-sidebar-foreground/70">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
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
