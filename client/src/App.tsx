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
import { Home, User, ClipboardList, Activity, CreditCard, DollarSign, Calendar, Settings } from "lucide-react";
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
    <Sidebar className="bg-slate-900 border-r border-slate-800">
      <SidebarHeader className="p-4 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-gradient-to-tl from-slate-800 via-transparent to-transparent opacity-40"></div>
          <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"></div>
          <div className="absolute bottom-8 right-12 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_3s_ease-in-out_infinite] opacity-70"></div>
          <div className="absolute bottom-16 right-6 w-1 h-1 bg-white rounded-full animate-[pulse_4s_ease-in-out_infinite] opacity-50"></div>
        </div>
        <button
          onClick={onClearSidebar}
          className="flex items-center gap-3 w-full text-left hover-elevate rounded-lg p-1 -m-1 relative z-10"
          data-testid="nav-home-logo"
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-600/20 flex items-center justify-center border border-emerald-600/30">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold tracking-[0.15em] uppercase">New Wave</p>
            <h1 className="font-light text-lg text-white tracking-tight">Plexus</h1>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="p-3 bg-slate-900">
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
                  className={`text-slate-300 hover:text-white hover:bg-white/10 ${isActive ? "bg-white/10 text-white" : ""}`}
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
              <header className="bg-slate-900 text-white shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-slate-800 via-transparent to-transparent opacity-40"></div>
                  <div className="absolute bottom-10 right-10 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"></div>
                  <div className="absolute bottom-24 right-32 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_3s_ease-in-out_infinite] opacity-70"></div>
                  <div className="absolute bottom-40 right-16 w-1 h-1 bg-white rounded-full animate-[pulse_4s_ease-in-out_infinite] opacity-50"></div>
                  <div className="absolute bottom-16 right-64 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_2.5s_ease-in-out_infinite] opacity-80"></div>
                  <div className="absolute bottom-48 right-52 w-1 h-1 bg-white rounded-full animate-[pulse_5s_ease-in-out_infinite] opacity-60"></div>
                  <div className="absolute -bottom-4 right-24 w-32 h-32 bg-[#4c1d95] rounded-full mix-blend-screen filter blur-[60px] opacity-10 animate-[pulse_6s_ease-in-out_infinite]"></div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="px-4 md:px-6 py-4 md:py-5 relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger className="text-slate-400 hover:text-white" data-testid="button-sidebar-toggle" />
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase">New Wave Physician Group</p>
                        <h2 className="text-xl md:text-2xl font-light tracking-tight text-white">
                          {getCurrentTitle()}
                        </h2>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                        {mainTabs.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = !sidebarTab && mainTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              data-testid={`tab-${tab.id}`}
                              onClick={() => handleMainTabChange(tab.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-colors ${
                                isActive 
                                  ? "bg-white/20 text-white" 
                                  : "text-slate-300 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
                        <span className="text-xs uppercase tracking-wider font-medium hidden md:inline">Active</span>
                      </div>

                      <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm group">
                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        <span className="text-xs font-medium tracking-wide text-slate-200 group-hover:text-white uppercase hidden md:inline">Calendar</span>
                      </button>
                    </div>
                  </div>
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
