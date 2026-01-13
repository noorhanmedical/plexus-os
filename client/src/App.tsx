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
  const stars = [
    { top: 8, left: 10, size: 2, opacity: 1, delay: 0 },
    { top: 12, left: 25, size: 1.5, opacity: 0.9, delay: 1.2 },
    { top: 10, left: 42, size: 2.5, opacity: 1, delay: 0.5 },
    { top: 15, left: 58, size: 1.8, opacity: 0.85, delay: 2 },
    { top: 11, left: 75, size: 2, opacity: 0.95, delay: 1.5 },
    { top: 9, left: 90, size: 1.5, opacity: 0.9, delay: 2.5 },
    { top: 18, left: 15, size: 1.5, opacity: 0.8, delay: 3 },
    { top: 16, left: 35, size: 2, opacity: 0.9, delay: 0.8 },
    { top: 22, left: 52, size: 1.8, opacity: 0.85, delay: 1.8 },
    { top: 19, left: 68, size: 2, opacity: 0.9, delay: 2.2 },
    { top: 14, left: 82, size: 1.5, opacity: 0.85, delay: 0.3 },
    { top: 25, left: 8, size: 1.5, opacity: 0.75, delay: 1.6 },
    { top: 24, left: 28, size: 1.8, opacity: 0.8, delay: 2.8 },
    { top: 28, left: 45, size: 1.5, opacity: 0.7, delay: 0.9 },
    { top: 26, left: 62, size: 1.8, opacity: 0.8, delay: 3.2 },
    { top: 30, left: 78, size: 1.5, opacity: 0.75, delay: 1.4 },
    { top: 27, left: 92, size: 1.8, opacity: 0.8, delay: 2.1 },
    { top: 35, left: 20, size: 1.2, opacity: 0.7, delay: 0.6 },
    { top: 32, left: 55, size: 1.5, opacity: 0.75, delay: 1.9 },
    { top: 38, left: 85, size: 1.2, opacity: 0.65, delay: 2.7 },
  ];

  const houses = [
    { left: 12, bottom: 8, width: 8, height: 6, windowColor: '#ffd54f' },
    { left: 28, bottom: 10, width: 6, height: 5, windowColor: '#ffb74d' },
    { left: 45, bottom: 6, width: 7, height: 5, windowColor: '#fff59d' },
    { left: 65, bottom: 9, width: 6, height: 5, windowColor: '#ffd54f' },
    { left: 82, bottom: 7, width: 7, height: 6, windowColor: '#ffb74d' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #1e293b 0%, #1a1a2e 15%, #16162b 40%, #141428 70%, #111124 100%)'
        }}
      />
      
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: '3s',
            background: 'radial-gradient(circle, #ffffff 0%, #ffffff 40%, transparent 100%)',
            boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(255,255,255,0.3)`
          }}
        />
      ))}

      <svg 
        className="absolute bottom-0 left-0 w-full h-[45%]"
        viewBox="0 0 100 30" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="snowyMountain1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="30%" stopColor="#3d4554" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
        </defs>
        <path 
          d="M0,30 L0,22 L8,20 L15,17 L22,14 L28,11 L35,8 L42,6 L48,4 L52,6 L58,9 L65,12 L72,15 L78,12 L85,9 L92,7 L100,10 L100,30 Z" 
          fill="url(#snowyMountain1)"
        />
        <path 
          d="M35,8 L42,6 L48,4 L52,6 L58,9 L55,8 L50,5 L45,7 L40,7 Z" 
          fill="#e2e8f0"
          opacity="0.6"
        />
        <path 
          d="M78,12 L85,9 L92,7 L100,10 L95,9 L88,10 L82,11 Z" 
          fill="#e2e8f0"
          opacity="0.5"
        />
      </svg>

      <svg 
        className="absolute bottom-0 left-0 w-full h-[30%]"
        viewBox="0 0 100 20" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="snowyMountain2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>
        </defs>
        <path 
          d="M0,20 L0,14 L10,12 L20,9 L28,7 L35,5 L42,3 L48,5 L55,8 L62,10 L70,8 L78,6 L85,4 L92,6 L100,9 L100,20 Z" 
          fill="url(#snowyMountain2)"
        />
        <path 
          d="M28,7 L35,5 L42,3 L48,5 L45,4 L38,4 L32,6 Z" 
          fill="#e2e8f0"
          opacity="0.5"
        />
        <path 
          d="M70,8 L78,6 L85,4 L92,6 L88,5 L80,6 L74,7 Z" 
          fill="#e2e8f0"
          opacity="0.4"
        />
      </svg>

      {houses.map((house, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${house.left}%`,
            bottom: `${house.bottom}%`,
            width: `${house.width}%`,
            height: `${house.height}%`,
          }}
        >
          <div 
            className="absolute bottom-0 w-full h-[70%]"
            style={{ background: '#1a1a24' }}
          />
          <div 
            className="absolute bottom-[70%] left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ 
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderBottom: '10px solid #1a1a24'
            }}
          />
          <div 
            className="absolute animate-pulse"
            style={{
              left: '30%',
              bottom: '25%',
              width: '3px',
              height: '3px',
              background: house.windowColor,
              boxShadow: `0 0 4px 2px ${house.windowColor}40`,
              opacity: 0.8,
              animationDuration: '5s',
              animationDelay: `${i * 0.5}s`
            }}
          />
          <div 
            className="absolute animate-pulse"
            style={{
              left: '55%',
              bottom: '25%',
              width: '3px',
              height: '3px',
              background: house.windowColor,
              boxShadow: `0 0 4px 2px ${house.windowColor}40`,
              opacity: 0.7,
              animationDuration: '6s',
              animationDelay: `${i * 0.3 + 1}s`
            }}
          />
        </div>
      ))}

      <div 
        className="absolute bottom-0 left-0 w-full h-[8%]"
        style={{
          background: 'linear-gradient(to top, #e2e8f0 0%, #cbd5e1 50%, transparent 100%)',
          opacity: 0.15
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
