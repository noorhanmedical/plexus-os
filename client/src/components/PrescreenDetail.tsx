import { useState, useEffect } from "react";
import { Save, Loader2, ClipboardList, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Prescreen } from "@shared/schema";
import { PRESCREEN_STATUSES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PrescreenDetailProps {
  prescreen: Prescreen | null;
  onSave?: () => void;
}

export function PrescreenDetail({ prescreen, onSave }: PrescreenDetailProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    scheduled_datetime: "",
    assigned_staff: "",
    location: "",
    notes: "",
  });
  const [status, setStatus] = useState("");
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalStatus, setOriginalStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prescreen) {
      const newFormData = {
        scheduled_datetime: prescreen.scheduled_datetime || "",
        assigned_staff: prescreen.assigned_staff || "",
        location: prescreen.location || "",
        notes: prescreen.notes || "",
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData);
      
      const currentStatus = prescreen.eligibility_status_final || prescreen.prescreen_status || "";
      setStatus(currentStatus);
      setOriginalStatus(currentStatus);
    }
  }, [prescreen]);

  const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
  const hasStatusChange = status !== originalStatus;
  const hasChanges = hasFormChanges || hasStatusChange;

  const handleSave = async () => {
    if (!prescreen?.prescreen_id) return;

    setIsSaving(true);
    try {
      if (hasFormChanges) {
        const response = await fetch("/api/prescreens/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescreen_id: prescreen.prescreen_id,
            updates: formData,
          }),
        });
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to update prescreen");
        }
      }

      if (hasStatusChange) {
        const response = await fetch("/api/prescreens/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescreen_id: prescreen.prescreen_id,
            status: status,
          }),
        });
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to update status");
        }
      }

      setOriginalFormData(formData);
      setOriginalStatus(status);
      
      toast({
        title: "Saved",
        description: "Prescreen updated successfully.",
      });

      onSave?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!prescreen) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
        <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-gray-500">Select a prescreen to view details</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-white">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Prescreen Details</h2>
            <p className="text-sm text-gray-500">
              {prescreen.requested_ancillary_code || "N/A"}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            data-testid="button-save-prescreen"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Eligibility Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Current Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(prescreen.eligibility_status_final || prescreen.prescreen_status || "")} border`}
                  >
                    {prescreen.eligibility_status_final || prescreen.prescreen_status || "Not Set"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Eligibility Reason</Label>
                <p className="text-sm mt-1 text-gray-900">{prescreen.eligibility_reason || "—"}</p>
              </div>
            </div>

            {prescreen.eligible_after_date && (
              <div>
                <Label className="text-xs text-gray-500">Eligible After</Label>
                <p className="text-sm mt-1 text-gray-900">{prescreen.eligible_after_date}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status" className="bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {PRESCREEN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} data-testid={`option-status-${s}`} className="text-gray-900">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasStatusChange && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved change
              </p>
            )}
          </CardContent>
        </Card>

        <Separator className="bg-gray-200" />

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_datetime" className="text-gray-700">Scheduled Date/Time</Label>
              <Input
                id="scheduled_datetime"
                data-testid="input-scheduled-datetime"
                type="datetime-local"
                value={formData.scheduled_datetime ? formData.scheduled_datetime.slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-gray-700">Location</Label>
              <Input
                id="location"
                data-testid="input-location"
                placeholder="Enter location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_staff" className="text-gray-700">Assigned Staff</Label>
              <Input
                id="assigned_staff"
                data-testid="input-assigned-staff"
                placeholder="Enter staff name"
                value={formData.assigned_staff}
                onChange={(e) => setFormData({ ...formData, assigned_staff: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              data-testid="textarea-notes"
              placeholder="Add notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[120px] resize-none bg-white border-gray-300 text-gray-900"
            />
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t border-gray-200 -mx-6 px-6">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-prescreen-footer"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    "Needs Review": "bg-amber-100 text-amber-800 border-amber-200",
    "Eligible": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Not Eligible": "bg-red-100 text-red-800 border-red-200",
    "Scheduled": "bg-blue-100 text-blue-800 border-blue-200",
    "Completed": "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[status] || "bg-gray-100 text-gray-600 border-gray-200";
}
