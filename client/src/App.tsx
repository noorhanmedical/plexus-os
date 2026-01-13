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
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 90%, rgba(45, 25, 55, 0.4) 0%, transparent 50%),
            linear-gradient(to top, #080810 0%, #0d1020 20%, #121828 40%, #0f1525 70%, #0a0d18 100%)
          `
        }}
      />
      
      <div className="absolute top-0 left-0 right-0 h-1/2">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animation: `pulse ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <svg 
        className="absolute bottom-0 left-0 w-full h-[75%]"
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,100 L0,70 L5,68 L10,65 L12,62 L15,58 L18,55 L20,52 L22,48 L25,42 L28,38 L30,35 L32,32 L35,28 L38,25 L40,22 L42,20 L45,18 L48,22 L50,26 L52,30 L55,34 L58,38 L60,42 L62,45 L65,48 L68,52 L70,55 L72,52 L75,48 L78,44 L80,40 L82,36 L85,32 L88,28 L90,24 L92,20 L95,16 L98,12 L100,10 L102,12 L105,16 L108,20 L110,24 L112,28 L115,32 L118,36 L120,40 L122,44 L125,48 L128,52 L130,56 L132,52 L135,48 L138,44 L140,40 L142,36 L145,32 L148,28 L150,25 L152,28 L155,32 L158,36 L160,40 L162,44 L165,48 L168,52 L170,56 L172,60 L175,64 L178,68 L180,72 L182,76 L185,80 L188,84 L190,88 L195,92 L200,95 L200,100 Z" 
          fill="url(#mountainGradientFar)"
        />
        <defs>
          <linearGradient id="mountainGradientFar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="50%" stopColor="#12121f" />
            <stop offset="100%" stopColor="#080810" />
          </linearGradient>
        </defs>
      </svg>

      <svg 
        className="absolute bottom-0 left-0 w-full h-[55%]"
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,100 L0,55 L3,52 L6,48 L9,45 L12,42 L15,38 L18,35 L20,32 L22,35 L25,38 L28,42 L30,45 L32,42 L35,38 L38,34 L40,30 L42,26 L45,22 L48,18 L50,15 L52,18 L55,22 L58,26 L60,30 L62,34 L65,38 L68,42 L70,46 L72,50 L75,54 L78,58 L80,62 L82,58 L85,54 L88,50 L90,46 L92,42 L95,38 L98,35 L100,38 L102,42 L105,46 L108,50 L110,54 L112,58 L115,62 L118,66 L120,70 L125,74 L130,78 L140,82 L150,86 L165,90 L180,94 L200,98 L200,100 Z" 
          fill="url(#mountainGradientMid)"
        />
        <defs>
          <linearGradient id="mountainGradientMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#16162a" />
            <stop offset="50%" stopColor="#0e0e1a" />
            <stop offset="100%" stopColor="#080810" />
          </linearGradient>
        </defs>
      </svg>

      <svg 
        className="absolute bottom-0 left-0 w-full h-[35%]"
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
      >
        <path 
          d="M0,100 L0,45 L5,42 L10,38 L15,35 L18,32 L20,28 L22,25 L25,22 L28,25 L30,28 L32,32 L35,35 L38,38 L40,42 L42,45 L45,48 L48,52 L50,55 L52,58 L55,62 L60,66 L70,72 L85,78 L100,84 L120,88 L145,92 L175,96 L200,100 Z" 
          fill="#050508"
        />
      </svg>

      <div 
        className="absolute bottom-0 left-0 right-0 h-12"
        style={{
          background: 'linear-gradient(to top, #050508, transparent)'
        }}
      />
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
    <Sidebar className="bg-gradient-to-b from-slate-900 via-slate-900 to-[#0c1222] border-r border-slate-800/50">
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
