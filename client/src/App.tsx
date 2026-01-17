import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HomeDashboard } from "@/pages/HomeDashboard";
import { PrescreensView } from "@/pages/PrescreensView";
import { AncillaryDashboard } from "@/pages/AncillaryDashboard";
import { BillingView } from "@/pages/BillingView";
import { FinanceView } from "@/pages/FinanceView";
import { ScheduleView } from "@/pages/ScheduleView";
import { PatientChart } from "@/pages/PatientChart";
import { NightSkyBackdrop } from "@/components/NightSkyBackdrop";
import { Home, Search, ClipboardList, Activity, DollarSign, Calendar, User, X, Loader2, Receipt, Settings, Video, Building2, MapPin, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

type MainTab = "home" | "prescreens" | "ancillary" | "finance" | "schedule" | "billing";

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
  { id: "billing" as MainTab, label: "Billing", icon: Receipt },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}


// Clinic and location data structure
const clinicData = [
  { 
    id: "nwpg", 
    label: "NWPG", 
    locations: [
      { id: "nwpg-spring", label: "Spring" },
      { id: "nwpg-veterans", label: "Veterans" }
    ]
  },
  { 
    id: "taylor", 
    label: "Taylor Family Practice", 
    locations: []
  },
  { 
    id: "servmd", 
    label: "ServMD", 
    locations: [
      { id: "servmd-glendale", label: "Glendale" },
      { id: "servmd-suncity", label: "Sun City" },
      { id: "servmd-prescott", label: "Prescott" }
    ]
  }
];

// Get all selectable IDs (clinics + locations)
const getAllSelectableIds = () => {
  const ids: string[] = [];
  clinicData.forEach(clinic => {
    ids.push(clinic.id);
    clinic.locations.forEach(loc => ids.push(loc.id));
  });
  return ids;
};

function AppSidebar({ 
  selectedPatient,
  onPatientSelect,
  onClearPatient 
}: { 
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onClearPatient: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 100);
  const [selectedClinics, setSelectedClinics] = useState<Set<string>>(new Set(getAllSelectableIds()));

  const { data: searchResults, isLoading } = useQuery<{ ok: boolean; data: Patient[] }>({
    queryKey: [`/api/patients/search?query=${encodeURIComponent(debouncedQuery)}&limit=20`],
    enabled: debouncedQuery.length >= 2,
    placeholderData: (prev) => prev,
  });

  const patients = searchResults?.data || [];

  const allIds = getAllSelectableIds();
  const isAllSelected = allIds.every(id => selectedClinics.has(id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedClinics(new Set());
    } else {
      setSelectedClinics(new Set(allIds));
    }
  };

  const toggleClinic = (clinicId: string) => {
    const newSelected = new Set(selectedClinics);
    const clinic = clinicData.find(c => c.id === clinicId);
    if (!clinic) return;

    if (newSelected.has(clinicId)) {
      newSelected.delete(clinicId);
      clinic.locations.forEach(loc => newSelected.delete(loc.id));
    } else {
      newSelected.add(clinicId);
      clinic.locations.forEach(loc => newSelected.add(loc.id));
    }
    setSelectedClinics(newSelected);
  };

  const toggleLocation = (locationId: string, clinicId: string) => {
    const newSelected = new Set(selectedClinics);
    if (newSelected.has(locationId)) {
      newSelected.delete(locationId);
    } else {
      newSelected.add(locationId);
      newSelected.add(clinicId);
    }
    setSelectedClinics(newSelected);
  };

  return (
    <Sidebar className="border-r border-[#1e1e38]/50">
      <NightSkyBackdrop starCount={80} showShootingStars={true} showHorizonGlow={true} />
      
      <SidebarHeader className="p-4 border-b border-slate-700/30 relative">
        <button
          onClick={onClearPatient}
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
        {/* Clinic Selection Section */}
        <SidebarGroup className="relative z-10 mb-4">
          <SidebarGroupLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Select Clinic
          </SidebarGroupLabel>
          
          <div className="space-y-2 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
            {/* Select All */}
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-700/30">
              <Checkbox 
                id="select-all" 
                checked={isAllSelected}
                onCheckedChange={toggleAll}
                className="border-slate-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                data-testid="checkbox-select-all"
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium text-white cursor-pointer"
              >
                Select All
              </label>
            </div>

            {/* Clinics and Locations */}
            {clinicData.map((clinic) => (
              <div key={clinic.id} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={clinic.id}
                    checked={selectedClinics.has(clinic.id)}
                    onCheckedChange={() => toggleClinic(clinic.id)}
                    className="border-slate-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    data-testid={`checkbox-clinic-${clinic.id}`}
                  />
                  <label 
                    htmlFor={clinic.id} 
                    className="text-sm text-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {clinic.label}
                  </label>
                </div>
                
                {/* Locations */}
                {clinic.locations.length > 0 && (
                  <div className="ml-6 space-y-1">
                    {clinic.locations.map((location) => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={location.id}
                          checked={selectedClinics.has(location.id)}
                          onCheckedChange={() => toggleLocation(location.id, clinic.id)}
                          className="border-slate-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 h-3.5 w-3.5"
                          data-testid={`checkbox-location-${location.id}`}
                        />
                        <label 
                          htmlFor={location.id} 
                          className="text-xs text-slate-400 cursor-pointer flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          {location.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SidebarGroup>

        {/* Patient Search Section - Now below clinic filter */}
        <SidebarGroup className="relative z-10">
          <SidebarGroupLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Patient Search
          </SidebarGroupLabel>
          
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 h-9"
              data-testid="input-patient-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {selectedPatient && (
            <div className="mb-3 p-2 bg-teal-900/30 border border-teal-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-medium">
                  {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {selectedPatient.last_name}, {selectedPatient.first_name}
                  </p>
                  <p className="text-teal-400 text-xs">Selected Patient</p>
                </div>
                <button
                  onClick={onClearPatient}
                  className="text-slate-400 hover:text-white"
                  data-testid="button-clear-patient"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 text-teal-400 animate-spin" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && patients.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No patients found</p>
          )}

          {patients.length > 0 && (
            <ScrollArea className="h-[calc(100vh-520px)]">
              <SidebarMenu className="space-y-1">
                {patients.map((patient) => (
                  <SidebarMenuItem key={patient.patient_uuid}>
                    <SidebarMenuButton
                      onClick={() => {
                        onPatientSelect(patient);
                        setSearchQuery("");
                      }}
                      isActive={selectedPatient?.patient_uuid === patient.patient_uuid}
                      className="text-slate-300/80 hover:text-white hover:bg-white/5"
                      data-testid={`patient-result-${patient.patient_uuid}`}
                    >
                      <User className="h-4 w-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {patient.last_name}, {patient.first_name}
                        </p>
                        {patient.dob && (
                          <p className="text-xs text-slate-500">{patient.dob}</p>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function MainContent() {
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const saved = localStorage.getItem("plexus_main_tab");
    return (saved as MainTab) || "home";
  });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(() => {
    const saved = localStorage.getItem("plexus_selected_patient");
    return saved ? JSON.parse(saved) : null;
  });
  const [billingServiceFilter, setBillingServiceFilter] = useState<string>("all");

  useEffect(() => {
    localStorage.setItem("plexus_main_tab", mainTab);
  }, [mainTab]);

  useEffect(() => {
    if (selectedPatient) {
      localStorage.setItem("plexus_selected_patient", JSON.stringify(selectedPatient));
    } else {
      localStorage.removeItem("plexus_selected_patient");
    }
  }, [selectedPatient]);

  const handleMainTabChange = (tab: MainTab, serviceFilter?: string) => {
    setMainTab(tab);
    if (tab === "billing") {
      setBillingServiceFilter(serviceFilter || "all");
    } else {
      setBillingServiceFilter("all");
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setMainTab("home");
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const renderContent = () => {
    if (selectedPatient) {
      return <PatientChart patient={selectedPatient} />;
    }

    switch (mainTab) {
      case "home":
        return <HomeDashboard onNavigate={handleMainTabChange} />;
      case "schedule":
        return <ScheduleView />;
      case "prescreens":
        return <PrescreensView />;
      case "ancillary":
        return <AncillaryDashboard />;
      case "finance":
        return <FinanceView />;
      case "billing":
        return <BillingView defaultServiceFilter={billingServiceFilter} onServiceFilterChange={setBillingServiceFilter} />;
      default:
        return <HomeDashboard onNavigate={handleMainTabChange} />;
    }
  };

  const getCurrentTitle = () => {
    if (selectedPatient) return `${selectedPatient.last_name}, ${selectedPatient.first_name}`;
    return mainTabs.find((t) => t.id === mainTab)?.label || "Home";
  };

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex flex-col h-screen w-full">
        <header className="bg-black text-white shadow-lg relative overflow-hidden z-50">
          <NightSkyBackdrop starCount={40} showShootingStars={true} showHorizonGlow={false} darkOnly={true} />
          
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
                  <button
                    data-testid="tab-home"
                    onClick={() => {
                      handleClearPatient();
                      handleMainTabChange("home");
                    }}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-colors ${
                      !selectedPatient && mainTab === "home"
                        ? "bg-white/20 text-white" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>Home</span>
                  </button>
                  
                  <button
                    data-testid="tab-admin"
                    onClick={() => {
                      handleClearPatient();
                      handleMainTabChange("prescreens");
                    }}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-colors ${
                      !selectedPatient && (mainTab === "prescreens" || mainTab === "ancillary" || mainTab === "billing")
                        ? "bg-white/20 text-white" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </button>
                  
                  {selectedPatient && (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-500/30 text-white border border-teal-400/50">
                      <User className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium max-w-24 truncate">
                        {selectedPatient.last_name}
                      </span>
                      <button
                        onClick={handleClearPatient}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        data-testid="button-close-patient-tab"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
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
          <AppSidebar 
            selectedPatient={selectedPatient} 
            onPatientSelect={handlePatientSelect} 
            onClearPatient={handleClearPatient} 
          />
          
          <main className="flex-1 overflow-auto p-6 bg-slate-100">
            {renderContent()}
          </main>

          {/* Right Panel - Telemedicine */}
          <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-700/50 p-4 hidden lg:flex flex-col">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                <Video className="h-4 w-4 text-teal-400" />
                Telemedicine
              </h3>
              <p className="text-slate-500 text-xs mt-1">Start instant video consultations</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-900/30">
                  <Video className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <Button
                onClick={() => {
                  // Placeholder for video start functionality
                  alert("Starting video consultation...");
                }}
                className="w-full bg-teal-600 text-white"
                size="lg"
                data-testid="button-start-video"
              >
                <Video className="h-5 w-5 mr-2" />
                Start Instant Video
              </Button>
            </div>

            <div className="space-y-3 flex-1">
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Ready</span>
                </div>
                <p className="text-slate-300 text-sm">Video system online</p>
              </div>
              
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-slate-400 text-xs mb-1">Quick Actions</p>
                <div className="space-y-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-slate-300"
                    data-testid="button-schedule-call"
                  >
                    Schedule a Call
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-slate-300"
                    data-testid="button-view-history"
                  >
                    View Call History
                  </Button>
                </div>
              </div>
            </div>
          </aside>
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
