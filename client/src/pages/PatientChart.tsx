import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Heart,
  Pill,
  AlertTriangle,
  FileText,
  Activity,
  Stethoscope,
  ClipboardList
} from "lucide-react";

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

interface PatientChartProps {
  patient: Patient;
}

export function PatientChart({ patient }: PatientChartProps) {
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="h-full flex flex-col gap-4" data-testid="patient-chart">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xl font-semibold">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white" data-testid="text-patient-name">
                {patient.last_name}, {patient.first_name}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-slate-400 text-sm">
                {patient.mrn && (
                  <span data-testid="text-patient-mrn">MRN: {patient.mrn}</span>
                )}
                {patient.dob && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {patient.dob} ({calculateAge(patient.dob)} yrs)
                  </span>
                )}
                {patient.gender && (
                  <Badge variant="outline" className="text-xs">
                    {patient.gender}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-right text-sm text-slate-400">
            {patient.phone && (
              <span className="flex items-center gap-2 justify-end">
                <Phone className="h-3.5 w-3.5" />
                {patient.phone}
              </span>
            )}
            {patient.email && (
              <span className="flex items-center gap-2 justify-end">
                <Mail className="h-3.5 w-3.5" />
                {patient.email}
              </span>
            )}
            {patient.insurance && (
              <Badge variant="secondary" className="ml-auto">
                {patient.insurance}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800/50">
          <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs">
            <Activity className="h-3.5 w-3.5 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="vitals" data-testid="tab-vitals" className="text-xs">
            <Heart className="h-3.5 w-3.5 mr-1" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="medications" data-testid="tab-medications" className="text-xs">
            <Pill className="h-3.5 w-3.5 mr-1" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="allergies" data-testid="tab-allergies" className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Allergies
          </TabsTrigger>
          <TabsTrigger value="diagnoses" data-testid="tab-diagnoses" className="text-xs">
            <Stethoscope className="h-3.5 w-3.5 mr-1" />
            Diagnoses
          </TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Notes
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4">
          <TabsContent value="overview" className="h-full m-0">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400" />
                    Recent Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-500 text-xs">Blood Pressure</p>
                      <p className="text-white font-medium">120/80 mmHg</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-500 text-xs">Heart Rate</p>
                      <p className="text-white font-medium">72 bpm</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-500 text-xs">Temperature</p>
                      <p className="text-white font-medium">98.6°F</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-slate-500 text-xs">SpO2</p>
                      <p className="text-white font-medium">98%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    Active Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive" className="text-xs">Penicillin</Badge>
                    <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">Shellfish</Badge>
                    <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">Latex</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-400" />
                    Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-24">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-white">Lisinopril 10mg</span>
                        <span className="text-slate-500 text-xs">Daily</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white">Metformin 500mg</span>
                        <span className="text-slate-500 text-xs">Twice Daily</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white">Atorvastatin 20mg</span>
                        <span className="text-slate-500 text-xs">At Bedtime</span>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-400" />
                    Active Diagnoses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-24">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-white">Essential Hypertension</span>
                        <span className="text-slate-500 text-xs">I10</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white">Type 2 Diabetes</span>
                        <span className="text-slate-500 text-xs">E11.9</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white">Hyperlipidemia</span>
                        <span className="text-slate-500 text-xs">E78.5</span>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-2 bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-teal-400" />
                    Pending Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-900/50 rounded p-3 border-l-2 border-teal-500">
                      <p className="text-white font-medium">CBC with Diff</p>
                      <p className="text-slate-500 text-xs mt-1">Ordered: Today</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3 border-l-2 border-blue-500">
                      <p className="text-white font-medium">Comprehensive Metabolic Panel</p>
                      <p className="text-slate-500 text-xs mt-1">Ordered: Today</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3 border-l-2 border-purple-500">
                      <p className="text-white font-medium">HbA1c</p>
                      <p className="text-slate-500 text-xs mt-1">Ordered: Yesterday</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals" className="h-full m-0">
            <Card className="bg-slate-800/50 border-slate-700/50 h-full">
              <CardHeader>
                <CardTitle className="text-slate-300">Vital Signs History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-400 text-center py-8">
                  Vitals history will be displayed here from the Plexus API
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications" className="h-full m-0">
            <Card className="bg-slate-800/50 border-slate-700/50 h-full">
              <CardHeader>
                <CardTitle className="text-slate-300">Medication List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-400 text-center py-8">
                  Full medication list will be displayed here from the Plexus API
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allergies" className="h-full m-0">
            <Card className="bg-slate-800/50 border-slate-700/50 h-full">
              <CardHeader>
                <CardTitle className="text-slate-300">Allergy List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-400 text-center py-8">
                  Allergy information will be displayed here from the Plexus API
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses" className="h-full m-0">
            <Card className="bg-slate-800/50 border-slate-700/50 h-full">
              <CardHeader>
                <CardTitle className="text-slate-300">Problem List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-400 text-center py-8">
                  Diagnoses and problem list will be displayed here from the Plexus API
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="h-full m-0">
            <Card className="bg-slate-800/50 border-slate-700/50 h-full">
              <CardHeader>
                <CardTitle className="text-slate-300">Clinical Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-400 text-center py-8">
                  Clinical notes will be displayed here from the Plexus API
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
