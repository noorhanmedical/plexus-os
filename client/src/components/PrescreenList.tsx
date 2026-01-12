import { useState, useEffect } from "react";
import { Plus, FileText, Loader2, Calendar, MapPin, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Patient, Prescreen } from "@shared/schema";

interface PrescreenListProps {
  patient: Patient | null;
  onPrescreenSelect: (prescreen: Prescreen) => void;
  selectedPrescreenId?: string;
  refreshTrigger?: number;
}

const statusColors: Record<string, string> = {
  "Needs Review": "bg-amber-100 text-amber-800 border-amber-200",
  "Eligible": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Not Eligible": "bg-red-100 text-red-800 border-red-200",
  "Scheduled": "bg-blue-100 text-blue-800 border-blue-200",
  "Completed": "bg-gray-100 text-gray-800 border-gray-200",
};

export function PrescreenList({ patient, onPrescreenSelect, selectedPrescreenId, refreshTrigger }: PrescreenListProps) {
  const [prescreens, setPrescreens] = useState<Prescreen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ancillaryCode, setAncillaryCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!patient) {
      setPrescreens([]);
      return;
    }

    const fetchPrescreens = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/prescreens?limit=200`);
        const data = await response.json();

        if (data.ok) {
          const filtered = (data.data || []).filter(
            (p: Prescreen) => p.patient_uuid === patient.patient_uuid
          );
          setPrescreens(filtered);
        } else {
          setError(data.error || "Failed to load prescreens");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescreens();
  }, [patient, refreshTrigger]);

  const handleCreate = async () => {
    if (!patient || !ancillaryCode.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/prescreens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_uuid: patient.patient_uuid,
          requested_ancillary_code: ancillaryCode.trim(),
        }),
      });
      const data = await response.json();

      if (data.ok) {
        setIsCreateOpen(false);
        setAncillaryCode("");
        const refetchResponse = await fetch(`/api/prescreens?limit=200`);
        const refetchData = await refetchResponse.json();
        if (refetchData.ok) {
          const filtered = (refetchData.data || []).filter(
            (p: Prescreen) => p.patient_uuid === patient.patient_uuid
          );
          setPrescreens(filtered);
        }
      } else {
        alert(data.error || "Failed to create prescreen");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (prescreen: Prescreen) => {
    const status = prescreen.eligibility_status_final || prescreen.prescreen_status || "Unknown";
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-600 border-gray-200";
    return (
      <Badge variant="outline" className={`${colorClass} font-medium border`}>
        {status}
      </Badge>
    );
  };

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-gray-500">Select a patient to view prescreens</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-sm text-gray-500">
            {prescreens.length} prescreen{prescreens.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-prescreen" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create Prescreen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="ancillary-code" className="text-gray-700">Ancillary Code</Label>
                <Input
                  id="ancillary-code"
                  data-testid="input-ancillary-code"
                  placeholder="e.g., 93880"
                  value={ancillaryCode}
                  onChange={(e) => setAncillaryCode(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!ancillaryCode.trim() || isCreating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-confirm-create"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Prescreen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && prescreens.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No prescreens found for this patient
          </div>
        )}

        <div className="p-2">
          {prescreens.map((prescreen) => (
            <button
              key={prescreen.prescreen_id || `${prescreen.patient_uuid}-${prescreen.requested_ancillary_code}`}
              data-testid={`button-prescreen-${prescreen.prescreen_id}`}
              onClick={() => onPrescreenSelect(prescreen)}
              className={`w-full text-left p-4 rounded-md mb-2 border transition-colors ${
                selectedPrescreenId === prescreen.prescreen_id
                  ? "bg-blue-50 border-blue-300"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="font-medium text-sm text-gray-900">
                  {prescreen.requested_ancillary_code || "N/A"}
                </span>
                {getStatusBadge(prescreen)}
              </div>

              {prescreen.scheduled_datetime && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(prescreen.scheduled_datetime).toLocaleString()}</span>
                </div>
              )}

              {prescreen.location && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <MapPin className="h-3 w-3" />
                  <span>{prescreen.location}</span>
                </div>
              )}

              {prescreen.assigned_staff && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserIcon className="h-3 w-3" />
                  <span>{prescreen.assigned_staff}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
