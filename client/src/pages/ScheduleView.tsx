import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronDown, Info, Plus, X, Search, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Patient, Prescreen } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SchedulingRow {
  id: string;
  patient_uuid: string;
  name: string;
  age: number | null;
  gender: string;
  tests: string[];
  callStatus: string;
  callAttempts: { first: string | null; second: string | null };
  apptDate: string;
  dx: string;
  recommend: string;
  insurance: string;
  prescreens: Prescreen[];
}

const ancillaryInfo: Record<string, { qualification: string; presentation: string }> = {
  'BrainWave': {
    qualification: 'Patient qualifies based on cognitive symptoms (memory problems, confusion, headaches), mood disorders (anxiety, depression), or neurological conditions.',
    presentation: '"Based on your symptoms, Dr. [Clinician] would like to get a better understanding of how your brain is functioning. This is a simple, non-invasive test that measures brain activity."'
  },
  'VitalWave': {
    qualification: 'Patient qualifies based on autonomic symptoms (dizziness, syncope, orthostatic hypotension), diabetic neuropathy, or cardiovascular concerns.',
    presentation: '"Your provider noticed some symptoms that could be related to how your nervous system controls your heart and blood vessels. This test helps us understand how your body regulates blood pressure."'
  },
  'PGx': {
    qualification: 'Patient qualifies if taking medications on the PGx trigger list, has history of adverse drug reactions, or is starting new psychiatric/cardiac medications.',
    presentation: '"This simple cheek swab test tells us how your body processes medications so we can make sure you\'re on the right dose."'
  },
  'Carotid US': {
    qualification: 'Patient qualifies based on stroke risk factors (HTN, DM, HLD, smoking, CAD), history of TIA/stroke, or carotid bruit on exam.',
    presentation: '"This ultrasound checks the blood flow in the arteries that supply blood to your brain. It helps us catch any blockages early."'
  },
  'Echo': {
    qualification: 'Patient qualifies based on cardiac symptoms (chest pain, shortness of breath, palpitations), heart failure risk, or murmur detected.',
    presentation: '"This is an ultrasound of your heart - no radiation, completely safe. It shows us how well your heart is pumping."'
  },
  'Renal artery US': {
    qualification: 'Patient qualifies based on resistant hypertension, renal insufficiency with HTN, or abdominal bruit.',
    presentation: '"This simple ultrasound can help us find treatable causes of high blood pressure."'
  },
  'AAA US': {
    qualification: 'Patient qualifies if male >65 with smoking history, or has risk factors like HTN, family history of aneurysm.',
    presentation: '"This is a quick ultrasound that checks the main blood vessel in your abdomen."'
  },
  'Lower ext arterial US': {
    qualification: 'Patient qualifies based on claudication, leg pain with walking, non-healing wounds, or abnormal pulses.',
    presentation: '"This ultrasound checks the arteries in your legs and helps us understand if there\'s any blockage."'
  },
  'Upper ext arterial US': {
    qualification: 'Patient qualifies based on arm claudication, arm pain, or abnormal arm blood pressure.',
    presentation: '"This ultrasound checks the arteries in your arms to ensure good blood flow."'
  },
  'Lower ext venous US': {
    qualification: 'Patient qualifies based on leg swelling, DVT risk factors, leg pain/tenderness, or history of blood clots.',
    presentation: '"This ultrasound checks the veins in your legs to make sure there isn\'t a blood clot."'
  },
  'Upper ext venous US': {
    qualification: 'Patient qualifies based on arm swelling, DVT risk factors, or history of blood clots.',
    presentation: '"This ultrasound checks the veins in your arms to ensure there are no blood clots."'
  },
  'Stress Echo': {
    qualification: 'Patient qualifies based on chest pain, shortness of breath with exertion, CAD evaluation.',
    presentation: '"This stress test with ultrasound helps us detect any areas of your heart not getting enough blood flow."'
  },
  'Abdominal artery US': {
    qualification: 'Patient qualifies based on abdominal pain, suspected mesenteric ischemia, or abdominal bruit.',
    presentation: '"This ultrasound checks the blood vessels in your abdomen."'
  },
  'IVC US': {
    qualification: 'Patient qualifies based on heart failure assessment, fluid status evaluation.',
    presentation: '"This ultrasound helps us see how much fluid is in your body."'
  },
  'Liver US': {
    qualification: 'Patient qualifies based on elevated liver enzymes, hepatomegaly, or liver disease risk factors.',
    presentation: '"This ultrasound checks your liver to make sure it\'s healthy."'
  }
};

const callStatusOptions = [
  { value: '', label: 'Select Status', color: 'bg-gray-600 text-gray-300' },
  { value: 'Contacted and Scheduled', label: 'Contacted and Scheduled', color: 'bg-emerald-700 text-white' },
  { value: 'LVM / Left Voice Mail', label: 'LVM / Left Voice Mail', color: 'bg-amber-600 text-white' },
  { value: 'No Answer', label: 'No Answer', color: 'bg-slate-500 text-white' },
  { value: 'Declined', label: 'Declined', color: 'bg-rose-700 text-white' },
  { value: 'Callback Requested', label: 'Callback Requested', color: 'bg-slate-600 text-white' },
];

function calculateAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function ScheduleView() {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [schedulingData, setSchedulingData] = useState<SchedulingRow[]>([]);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPatientForAdd, setSelectedPatientForAdd] = useState<Patient | null>(null);
  const [selectedAncillaries, setSelectedAncillaries] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearching } = useQuery<{ ok: boolean; data?: Patient[] }>({
    queryKey: ["/api/patients/search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/patients/search?query=${encodeURIComponent(debouncedQuery)}&limit=20`);
      return response.json();
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000,
  });

  const { data: prescreensData, isLoading: isPrescreensLoading } = useQuery<{ ok: boolean; data?: Prescreen[] }>({
    queryKey: ["/api/prescreens"],
    staleTime: 30000,
  });

  const { data: ancillaryCatalog } = useQuery<{ ok: boolean; data?: { code: string; name: string; category: string }[] }>({
    queryKey: ["/api/ancillary/catalog"],
    staleTime: 60000,
  });

  const availableAncillaries = ancillaryCatalog?.data?.map(a => a.name || a.code) || [
    'BrainWave', 'VitalWave', 'PGx',
    'Carotid US', 'Echo', 'Renal artery US', 'AAA US',
    'Lower ext arterial US', 'Upper ext arterial US',
    'Lower ext venous US', 'Upper ext venous US',
    'Stress Echo', 'Abdominal artery US', 'IVC US', 'Liver US'
  ];

  const createPrescreenMutation = useMutation({
    mutationFn: async ({ patient_uuid, requested_ancillary_code }: { patient_uuid: string; requested_ancillary_code: string }) => {
      return apiRequest("POST", "/api/prescreens", { patient_uuid, requested_ancillary_code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescreens"] });
    },
  });

  useEffect(() => {
    if (prescreensData?.ok && prescreensData.data) {
      const patientMap = new Map<string, { prescreens: Prescreen[]; tests: string[] }>();
      
      for (const prescreen of prescreensData.data) {
        if (!patientMap.has(prescreen.patient_uuid)) {
          patientMap.set(prescreen.patient_uuid, { prescreens: [], tests: [] });
        }
        const entry = patientMap.get(prescreen.patient_uuid)!;
        entry.prescreens.push(prescreen);
        if (prescreen.requested_ancillary_code && !entry.tests.includes(prescreen.requested_ancillary_code)) {
          entry.tests.push(prescreen.requested_ancillary_code);
        }
      }

      const fetchPatientDetails = async () => {
        const rows: SchedulingRow[] = [];
        for (const [patient_uuid, data] of Array.from(patientMap.entries())) {
          try {
            const response = await fetch(`/api/patients/${patient_uuid}`);
            const patientData = await response.json();
            if (patientData.ok && patientData.data) {
              const patient = patientData.data;
              rows.push({
                id: patient_uuid,
                patient_uuid,
                name: `${patient.last_name?.toUpperCase() || ''}, ${patient.first_name || ''}`,
                age: calculateAge(patient.date_of_birth),
                gender: patient.sex_assigned_at_birth || 'Unknown',
                tests: data.tests,
                callStatus: '',
                callAttempts: { first: null, second: null },
                apptDate: data.prescreens[0]?.scheduled_datetime || '',
                dx: patient.notes || '',
                recommend: '',
                insurance: patient.payor_name || '',
                prescreens: data.prescreens,
              });
            }
          } catch (error) {
            rows.push({
              id: patient_uuid,
              patient_uuid,
              name: `Patient ${patient_uuid.slice(0, 8)}`,
              age: null,
              gender: 'Unknown',
              tests: data.tests,
              callStatus: '',
              callAttempts: { first: null, second: null },
              apptDate: '',
              dx: '',
              recommend: '',
              insurance: '',
              prescreens: data.prescreens,
            });
          }
        }
        setSchedulingData(rows);
      };

      if (patientMap.size > 0) {
        fetchPatientDetails();
      }
    }
  }, [prescreensData]);

  const getTestColor = (test: string) => {
    if (test.includes('VitalWave')) return 'bg-rose-800 text-rose-100';
    if (test.includes('BrainWave')) return 'bg-violet-800 text-violet-100';
    if (test.includes('PGx')) return 'bg-amber-700 text-amber-100';
    if (test.includes('Carotid')) return 'bg-teal-700 text-teal-100';
    if (test.includes('Echo')) return 'bg-fuchsia-800 text-fuchsia-100';
    if (test.includes('Stress')) return 'bg-pink-800 text-pink-100';
    if (test.includes('Renal')) return 'bg-cyan-800 text-cyan-100';
    if (test.includes('AAA')) return 'bg-orange-800 text-orange-100';
    if (test.includes('arterial')) return 'bg-red-900 text-red-100';
    if (test.includes('venous')) return 'bg-sky-800 text-sky-100';
    if (test.includes('Abdominal')) return 'bg-slate-700 text-slate-100';
    if (test.includes('IVC')) return 'bg-indigo-800 text-indigo-100';
    if (test.includes('Liver')) return 'bg-emerald-800 text-emerald-100';
    return 'bg-gray-600 text-gray-100';
  };

  const getStatusColor = (status: string) => {
    const opt = callStatusOptions.find(o => o.value === status);
    return opt?.color || 'bg-gray-600 text-gray-300';
  };

  const toggleAncillary = async (rowId: string, test: string) => {
    const row = schedulingData.find(r => r.id === rowId);
    if (!row) return;

    const hasTest = row.tests.includes(test);
    if (!hasTest) {
      await createPrescreenMutation.mutateAsync({
        patient_uuid: row.patient_uuid,
        requested_ancillary_code: test,
      });
    }
    
    setSchedulingData(prev => prev.map(r => {
      if (r.id === rowId) {
        const newTests = hasTest ? r.tests.filter(t => t !== test) : [...r.tests, test];
        return { ...r, tests: newTests };
      }
      return r;
    }));
  };

  const updateSchedulingRow = (id: string, field: string, value: any) => {
    setSchedulingData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const toggleCallAttempt = (id: string, attempt: 'first' | 'second') => {
    setSchedulingData(prev => prev.map(row => {
      if (row.id === id) {
        const currentValue = row.callAttempts[attempt];
        const newValue = currentValue ? null : (attempt === 'first' ? '1st Attempt' : '2nd Attempt');
        return { ...row, callAttempts: { ...row.callAttempts, [attempt]: newValue } };
      }
      return row;
    }));
  };

  const handleAddPatient = async () => {
    if (!selectedPatientForAdd || selectedAncillaries.length === 0) return;

    for (const ancillary of selectedAncillaries) {
      await createPrescreenMutation.mutateAsync({
        patient_uuid: selectedPatientForAdd.patient_uuid,
        requested_ancillary_code: ancillary,
      });
    }

    setIsAddPatientOpen(false);
    setSelectedPatientForAdd(null);
    setSelectedAncillaries([]);
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["/api/prescreens"] });
  };

  const toggleAncillarySelection = (ancillary: string) => {
    setSelectedAncillaries(prev => 
      prev.includes(ancillary) 
        ? prev.filter(a => a !== ancillary) 
        : [...prev, ancillary]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Scheduling & Call Tracking
            </h2>
            <p className="text-slate-400 text-sm">Manage patient appointments and follow-ups</p>
          </div>
        </div>
        <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-patient-schedule" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient to Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Patient to Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!selectedPatientForAdd ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      data-testid="input-schedule-patient-search"
                      placeholder="Search patients by name, MRN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-64 border rounded-md">
                    {isSearching && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {searchResults?.ok && searchResults.data?.map((patient) => (
                      <button
                        key={patient.patient_uuid}
                        data-testid={`schedule-patient-${patient.patient_uuid}`}
                        onClick={() => setSelectedPatientForAdd(patient)}
                        className="w-full text-left p-3 hover-elevate border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {patient.mrn && `MRN: ${patient.mrn}`}
                              {patient.date_of_birth && ` | DOB: ${patient.date_of_birth}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {!isSearching && debouncedQuery && (!searchResults?.data?.length) && (
                      <div className="p-4 text-center text-muted-foreground">No patients found</div>
                    )}
                    {!debouncedQuery && (
                      <div className="p-4 text-center text-muted-foreground">Type to search patients</div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedPatientForAdd.first_name} {selectedPatientForAdd.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPatientForAdd.mrn && `MRN: ${selectedPatientForAdd.mrn}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedPatientForAdd(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Ancillaries</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableAncillaries.map((ancillary) => (
                        <button
                          key={ancillary}
                          data-testid={`ancillary-${ancillary.replace(/\s+/g, '-')}`}
                          onClick={() => toggleAncillarySelection(ancillary)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            selectedAncillaries.includes(ancillary)
                              ? getTestColor(ancillary)
                              : 'bg-muted hover:bg-accent'
                          }`}
                        >
                          {ancillary}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                      setSelectedPatientForAdd(null);
                      setSelectedAncillaries([]);
                    }}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="button-confirm-add-patient"
                      onClick={handleAddPatient}
                      disabled={selectedAncillaries.length === 0 || createPrescreenMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {createPrescreenMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Add to Schedule ({selectedAncillaries.length} tests)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-6 overflow-x-auto">
        {isPrescreensLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : schedulingData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No patients scheduled yet.</p>
            <p className="text-sm">Click "Add Patient to Schedule" to get started.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wide">Name</th>
                  <th className="text-center px-3 py-3 font-semibold uppercase text-xs tracking-wide">Age</th>
                  <th className="text-center px-3 py-3 font-semibold uppercase text-xs tracking-wide">Gender</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wide min-w-[300px]">Qualifying Tests</th>
                  <th className="text-center px-4 py-3 font-semibold uppercase text-xs tracking-wide min-w-[180px]">Call Status</th>
                  <th className="text-center px-4 py-3 font-semibold uppercase text-xs tracking-wide">Appt Date</th>
                  <th className="text-center px-4 py-3 font-semibold uppercase text-xs tracking-wide">Attempts</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wide">Dx</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wide">Recommend</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase text-xs tracking-wide">Insurance</th>
                </tr>
              </thead>
              <tbody>
                {schedulingData.map((row) => (
                  <>
                    <tr 
                      key={row.id}
                      data-testid={`schedule-row-${row.id}`}
                      className={`border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${expandedRowId === row.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedRowId === row.id ? 'rotate-180' : ''}`} />
                          {row.name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{row.age || '-'}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{row.gender}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {row.tests.map((test, idx) => (
                            <span 
                              key={idx} 
                              className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${getTestColor(test)}`}
                              onClick={() => toggleAncillary(row.id, test)}
                              title="Click to remove"
                            >
                              {test} ×
                            </span>
                          ))}
                          <select
                            className="px-2 py-0.5 rounded text-xs border border-dashed border-muted-foreground bg-background text-muted-foreground cursor-pointer"
                            value=""
                            onChange={(e) => {
                              if (e.target.value && !row.tests.includes(e.target.value)) {
                                toggleAncillary(row.id, e.target.value);
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="">+ Add</option>
                            {availableAncillaries.filter(a => !row.tests.includes(a)).map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`w-full px-2 py-1 rounded text-xs font-medium ${getStatusColor(row.callStatus)}`}
                          value={row.callStatus}
                          onChange={(e) => updateSchedulingRow(row.id, 'callStatus', e.target.value)}
                        >
                          {callStatusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="date"
                          value={row.apptDate}
                          onChange={(e) => updateSchedulingRow(row.id, 'apptDate', e.target.value)}
                          className="w-32 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${row.callAttempts.first ? 'bg-slate-600 text-white' : 'bg-muted text-muted-foreground'}`}
                            onClick={() => toggleCallAttempt(row.id, 'first')}
                          >
                            1st
                          </button>
                          <button
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${row.callAttempts.second ? 'bg-slate-600 text-white' : 'bg-muted text-muted-foreground'}`}
                            onClick={() => toggleCallAttempt(row.id, 'second')}
                          >
                            2nd
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={row.dx}
                          onChange={(e) => updateSchedulingRow(row.id, 'dx', e.target.value)}
                          placeholder="Diagnosis..."
                          className="text-xs w-28"
                        />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={row.recommend}
                          onChange={(e) => updateSchedulingRow(row.id, 'recommend', e.target.value)}
                          placeholder="Recommend..."
                          className="text-xs w-24"
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.insurance}</td>
                    </tr>
                    {expandedRowId === row.id && (
                      <tr key={`${row.id}-expanded`} className="bg-muted/30">
                        <td colSpan={10} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <Info className="w-4 h-4" />
                              Qualification & Presentation Guide for {row.name}
                            </div>
                            {row.tests.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic py-2">No ancillaries selected. Use the "+ Add" dropdown to add tests.</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                {row.tests.map((test) => {
                                  const info = ancillaryInfo[test];
                                  if (!info) return (
                                    <div key={test} className="bg-card rounded-lg border border-border p-3 shadow-sm">
                                      <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${getTestColor(test)}`}>
                                        {test}
                                      </div>
                                      <p className="text-xs text-muted-foreground italic">No info available.</p>
                                    </div>
                                  );
                                  return (
                                    <div key={test} className="bg-card rounded-lg border border-border p-3 shadow-sm">
                                      <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${getTestColor(test)}`}>
                                        {test}
                                      </div>
                                      <div className="space-y-2">
                                        <div>
                                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Qualifies</h4>
                                          <p className="text-xs leading-snug line-clamp-3">{info.qualification}</p>
                                        </div>
                                        <div>
                                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Present</h4>
                                          <p className="text-xs leading-snug italic bg-muted p-2 rounded border-l-2 border-primary/30 line-clamp-3">{info.presentation}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
