import { useState, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { HomeDashboard } from "@/pages/HomeDashboard";
import { PatientSearchView } from "@/pages/PatientSearchView";
import { PrescreensView } from "@/pages/PrescreensView";
import { AncillaryDashboard } from "@/pages/AncillaryDashboard";
import { BillingView } from "@/pages/BillingView";
import { FinanceView } from "@/pages/FinanceView";
import { ScheduleView } from "@/pages/ScheduleView";
import { PatientProfile } from "@/pages/PatientProfile";
import { Home, User, ClipboardList, Activity, CreditCard, DollarSign, Calendar, Search, X, Loader2 } from "lucide-react";
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
        <TwinklingStars />
        <button
          onClick={onClearSidebar}
          className="flex items-center gap-3 w-full text-left hover-elevate rounded-lg p-1 -m-1 relative z-10"
          data-testid="nav-home-logo"
        >
          <div className="h-10 w-10 rounded-lg bg-[#1a3d2e]/60 flex items-center justify-center border border-[#2d5a47]/50">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a9a7c] animate-pulse"></div>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.15em] uppercase">Clinical EMR</p>
            <h1 className="font-light text-lg text-white tracking-tight">Plexus</h1>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="p-3 bg-slate-900 relative">
        <TwinklingStars />
        <SidebarMenu className="relative z-10">
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

function MainContent() {
  const [mainTab, setMainTab] = useState<MainTab>("home");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading: isSearching } = useQuery<{ ok: boolean; data?: Patient[] }>({
    queryKey: ["/api/patients/search", searchQuery],
    enabled: searchQuery.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setSearchQuery("");
    setShowSearchResults(false);
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

  const patients = searchResults?.data || [];

  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar activeTab={sidebarTab} onTabChange={handleSidebarTabChange} onClearSidebar={handleClearSidebar} />
            
            <main className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-slate-900 text-white shadow-lg relative overflow-hidden">
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
                      <div ref={searchRef} className="relative">
                        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
                          <Search className="h-4 w-4 text-slate-400" />
                          <Input
                            data-testid="input-header-search"
                            type="text"
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowSearchResults(true);
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            className="w-40 md:w-56 bg-transparent border-0 p-0 h-auto text-sm text-white placeholder:text-slate-400 focus-visible:ring-0"
                          />
                          {searchQuery && (
                            <button 
                              onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                        </div>
                        
                        {showSearchResults && searchQuery.length >= 2 && (
                          <div className="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
                            {patients.length === 0 ? (
                              <div className="p-3 text-sm text-slate-400 text-center">
                                {isSearching ? "Searching..." : "No patients found"}
                              </div>
                            ) : (
                              patients.map((patient) => (
                                <button
                                  key={patient.patient_uuid}
                                  data-testid={`search-result-${patient.patient_uuid}`}
                                  onClick={() => handlePatientSelect(patient)}
                                  className="w-full p-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                                >
                                  <div className="h-8 w-8 rounded-full bg-[#3d2e1a]/40 flex items-center justify-center">
                                    <User className="h-4 w-4 text-[#c4a35a]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {patient.last_name}, {patient.first_name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {patient.dob && `DOB: ${patient.dob}`}
                                      {patient.mrn && ` | MRN: ${patient.mrn}`}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

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

              <div className="flex-1 overflow-auto p-6 bg-background">
                {renderContent()}
              </div>
            </main>
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
