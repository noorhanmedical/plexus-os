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
  "Needs Review": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Eligible": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Not Eligible": "bg-red-500/15 text-red-700 dark:text-red-400",
  "Scheduled": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "Completed": "bg-slate-500/15 text-slate-700 dark:text-slate-400",
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
    const colorClass = statusColors[status] || "bg-muted text-muted-foreground";
    return (
      <Badge variant="secondary" className={`${colorClass} font-medium`}>
        {status}
      </Badge>
    );
  };

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Select a patient to view prescreens</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold truncate">
            {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {prescreens.length} prescreen{prescreens.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-prescreen">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Prescreen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="ancillary-code">Ancillary Code</Label>
                <Input
                  id="ancillary-code"
                  data-testid="input-ancillary-code"
                  placeholder="e.g., 93880"
                  value={ancillaryCode}
                  onChange={(e) => setAncillaryCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!ancillaryCode.trim() || isCreating}
                className="w-full"
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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && prescreens.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No prescreens found for this patient
          </div>
        )}

        <div className="p-2">
          {prescreens.map((prescreen) => (
            <button
              key={prescreen.prescreen_id || `${prescreen.patient_uuid}-${prescreen.requested_ancillary_code}`}
              data-testid={`button-prescreen-${prescreen.prescreen_id}`}
              onClick={() => onPrescreenSelect(prescreen)}
              className={`w-full text-left p-4 rounded-md mb-2 border transition-colors hover-elevate ${
                selectedPrescreenId === prescreen.prescreen_id
                  ? "bg-accent border-accent-border"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="font-medium text-sm">
                  {prescreen.requested_ancillary_code || "N/A"}
                </span>
                {getStatusBadge(prescreen)}
              </div>

              {prescreen.scheduled_datetime && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(prescreen.scheduled_datetime).toLocaleString()}</span>
                </div>
              )}

              {prescreen.location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  <span>{prescreen.location}</span>
                </div>
              )}

              {prescreen.assigned_staff && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
