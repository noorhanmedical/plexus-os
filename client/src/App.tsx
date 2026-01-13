import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HomeDashboard } from "@/pages/HomeDashboard";
import { PatientSearchView } from "@/pages/PatientSearchView";
import { PrescreensView } from "@/pages/PrescreensView";
import { AncillaryDashboard } from "@/pages/AncillaryDashboard";
import { BillingView } from "@/pages/BillingView";
import { FinanceView } from "@/pages/FinanceView";
import { ScheduleView } from "@/pages/ScheduleView";
import { PatientProfile } from "@/pages/PatientProfile";
import { Home, User, ClipboardList, Activity, CreditCard, DollarSign, Calendar } from "lucide-react";
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

type MainTab = "home" | "prescreens" | "ancillary" | "finance" | "schedule";
type SidebarTab = "patient" | "billing";

interface Patient {
  patient_uuid: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  insurance?: string;
  mrn?: string;
}

const mainTabs = [
  { id: "home" as MainTab, label: "Home", icon: Home },
  { id: "schedule" as MainTab, label: "Schedule", icon: Calendar },
  { id: "prescreens" as MainTab, label: "Prescreens", icon: ClipboardList },
  { id: "ancillary" as MainTab, label: "Ancillary", icon: Activity },
  { id: "finance" as MainTab, label: "Finance", icon: DollarSign },
];

const sidebarTabs = [
  { id: "patient" as SidebarTab, label: "Patient Search", icon: User },
  { id: "billing" as SidebarTab, label: "Billing", icon: CreditCard },
];

function TwinklingStars({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"></div>
      <div className="absolute top-1/3 left-1/3 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_3s_ease-in-out_infinite] opacity-70"></div>
      <div className="absolute top-2/3 left-2/3 w-1 h-1 bg-white rounded-full animate-[pulse_4s_ease-in-out_infinite] opacity-50"></div>
      <div className="absolute top-1/4 left-3/4 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_2.5s_ease-in-out_infinite] opacity-80"></div>
      <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-white rounded-full animate-[pulse_5s_ease-in-out_infinite] opacity-60"></div>
      <div className="absolute top-1/2 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_3.5s_ease-in-out_infinite] opacity-40"></div>
      <div className="absolute top-1/3 left-2/3 w-0.5 h-0.5 bg-white rounded-full animate-[pulse_4.5s_ease-in-out_infinite] opacity-55"></div>
    </div>
  );
}

function MountainSilhouette() {
  const stars: { top: number; left: number; size: number; opacity: number; delay: number }[] = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      top: Math.random() * 65,
      left: Math.random() * 100,
      size: 0.5 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 4
    });
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #0d0d1a 0%, #1a1a3a 40%, #2a2045 70%, #3d2855 85%, #4a2860 95%, #1a1a30 100%)'
        }}
      />
      
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: '3s'
          }}
        />
      ))}

      <svg 
        className="absolute bottom-0 left-0 w-full h-[55%]"
        viewBox="0 0 100 55" 
        preserveAspectRatio="none"
      >
        <path 
          d="M-5,55 L-5,45 L0,42 L3,38 L5,35 L8,30 L10,26 L12,22 L14,18 L16,14 L18,10 L20,7 L22,5 L24,8 L26,12 L28,16 L30,20 L32,24 L34,28 L36,25 L38,21 L40,17 L42,13 L44,10 L46,7 L48,4 L50,2 L52,5 L54,9 L56,13 L58,17 L60,21 L62,18 L64,14 L66,11 L68,8 L70,12 L72,16 L74,20 L76,24 L78,28 L80,32 L82,28 L84,24 L86,20 L88,24 L90,28 L92,32 L94,36 L96,40 L98,44 L100,48 L105,55 Z" 
          fill="#1a1a2e"
        />
        <path 
          d="M-5,55 L-5,48 L2,44 L6,40 L10,36 L14,32 L18,28 L22,24 L26,20 L28,18 L30,21 L34,25 L38,29 L40,26 L44,22 L48,18 L50,16 L52,19 L56,23 L60,27 L64,31 L68,27 L72,23 L76,27 L80,31 L84,35 L88,39 L92,43 L96,47 L100,51 L105,55 Z" 
          fill="#121220"
        />
      </svg>
    </div>
  );
}

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
    <Sidebar className="bg-[#16162b] border-r border-[#1e1e38]/50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <MountainSilhouette />
      </div>
      
      <SidebarHeader className="p-4 border-b border-slate-700/30 relative">
        <button
          onClick={onClearSidebar}
          className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 -m-1 relative z-10 transition-colors"
          data-testid="nav-home-logo"
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#1a3d2e]/80 to-[#0f2920]/80 flex items-center justify-center border border-[#2d5a47]/60 shadow-lg shadow-teal-900/20">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a9a7c] animate-pulse shadow-[0_0_10px_rgba(74,154,124,0.5)]"></div>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-semibold tracking-[0.2em] uppercase">Clinical EMR</p>
            <h1 className="font-light text-lg text-white/90 tracking-tight">Plexus</h1>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="p-3 relative">
        <SidebarMenu className="relative z-10 space-y-1">
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
                  className={`text-slate-300/80 hover:text-white hover:bg-white/5 transition-all ${
                    isActive 
                      ? "bg-gradient-to-r from-white/10 to-transparent text-white border-l-2 border-teal-400/60" 
                      : "border-l-2 border-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-teal-400" : ""}`} />
                  <span className="font-medium">{tab.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

function MainContent() {
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
    setSelectedPatient(null);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setMainTab("home");
    setSidebarTab(null);
  };

  const renderContent = () => {
    if (sidebarTab === "patient") {
      return <PatientSearchView onPatientSelect={handlePatientSelect} />;
    }
    if (sidebarTab === "billing") {
      return <BillingView />;
    }

    switch (mainTab) {
      case "home":
        return (
          <div className="space-y-6">
            <HomeDashboard />
            {selectedPatient && (
              <PatientProfile 
                patient={selectedPatient} 
                onClose={() => setSelectedPatient(null)} 
              />
            )}
          </div>
        );
      case "schedule":
        return <ScheduleView />;
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
    if (selectedPatient) return `${selectedPatient.last_name}, ${selectedPatient.first_name}`;
    return mainTabs.find((t) => t.id === mainTab)?.label || "Home";
  };

  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex flex-col h-screen w-full">
        <header className="bg-slate-900 text-white shadow-lg relative overflow-hidden z-50">
          <TwinklingStars />
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="px-4 md:px-6 py-4 md:py-5 relative z-10">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-slate-400 hover:text-white" data-testid="button-sidebar-toggle" />
                <div>
                  <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase">Clinical EMR</p>
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
                  <div className="w-2 h-2 rounded-full bg-[#4a9a7c] animate-pulse"></div>
                  <span className="text-xs uppercase tracking-wider font-medium hidden md:inline">Active</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 w-full overflow-hidden">
          <AppSidebar activeTab={sidebarTab} onTabChange={handleSidebarTabChange} onClearSidebar={handleClearSidebar} />
          
          <main className="flex-1 overflow-auto p-6 bg-background">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <>
          <MainContent />
          <Toaster />
        </>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
