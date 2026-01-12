import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, ClipboardList, ChevronRight, Save, RefreshCw } from "lucide-react";
import type { Prescreen } from "@shared/schema";

interface PrescreensResponse {
  ok: boolean;
  data?: Prescreen[];
  error?: string;
}

export function PrescreensView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrescreen, setSelectedPrescreen] = useState<Prescreen | null>(null);
  const [editedPrescreen, setEditedPrescreen] = useState<Partial<Prescreen>>({});
  const { toast } = useToast();

  const { data: response, isLoading } = useQuery<PrescreensResponse>({
    queryKey: ["/api/prescreens?limit=200"],
  });
  
  const prescreens = response?.data || [];

  const updateMutation = useMutation({
    mutationFn: async (data: { prescreen_id: string; updates: Partial<Prescreen> }) => {
      return apiRequest("PATCH", `/api/prescreens/${data.prescreen_id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith("/api/prescreens") ?? false
      });
      toast({ title: "Prescreen updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update prescreen", variant: "destructive" });
    },
  });

  const filteredPrescreens = prescreens.filter((p) => {
    const search = searchTerm.toLowerCase();
    return (
      p.patient_uuid?.toLowerCase().includes(search) ||
      p.requested_ancillary_code?.toLowerCase().includes(search) ||
      p.prescreen_status?.toLowerCase().includes(search) ||
      p.location?.toLowerCase().includes(search)
    );
  });

  const handleSelectPrescreen = (prescreen: Prescreen) => {
    setSelectedPrescreen(prescreen);
    setEditedPrescreen({});
  };

  const handleSave = () => {
    if (selectedPrescreen && Object.keys(editedPrescreen).length > 0) {
      updateMutation.mutate({ prescreen_id: selectedPrescreen.prescreen_id, updates: editedPrescreen });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "eligible": 
      case "completed": return "bg-[#1a3d2e]/40 text-[#4a9a7c] border-[#1a3d2e]";
      case "needs review":
      case "pending": return "bg-[#3d2e1a]/40 text-[#c4a35a] border-[#3d2e1a]";
      case "not eligible":
      case "disqualified": return "bg-[#3d1a1a]/40 text-[#a35a5a] border-[#3d1a1a]";
      case "scheduled": return "bg-slate-700/30 text-slate-400 border-slate-700";
      default: return "bg-slate-700/30 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
      <Card className="glow-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            All Prescreens
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-prescreen-search"
              placeholder="Search prescreens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-18rem)]">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredPrescreens?.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No prescreens found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredPrescreens?.map((prescreen) => (
                  <button
                    key={prescreen.prescreen_id}
                    data-testid={`prescreen-item-${prescreen.prescreen_id}`}
                    onClick={() => handleSelectPrescreen(prescreen)}
                    className={`w-full p-3 rounded-lg text-left hover-elevate flex items-center justify-between gap-2 ${
                      selectedPrescreen?.prescreen_id === prescreen.prescreen_id
                        ? "bg-primary/20 border border-primary/40"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {prescreen.requested_ancillary_code}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {prescreen.location || "No location"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(prescreen.prescreen_status)}`}>
                        {prescreen.prescreen_status || "Unknown"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 glow-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-lg">Prescreen Details</CardTitle>
          {selectedPrescreen && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedPrescreen({});
                  queryClient.invalidateQueries({ predicate: (query) => 
                    query.queryKey[0]?.toString().startsWith("/api/prescreens") ?? false
                  });
                }}
                data-testid="button-refresh-prescreen"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={Object.keys(editedPrescreen).length === 0 || updateMutation.isPending}
                data-testid="button-save-prescreen"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {selectedPrescreen ? (
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Ancillary Code</label>
                    <Input
                      data-testid="input-ancillary-code"
                      value={editedPrescreen.requested_ancillary_code ?? selectedPrescreen.requested_ancillary_code ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, requested_ancillary_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Input
                      data-testid="input-status"
                      value={editedPrescreen.prescreen_status ?? selectedPrescreen.prescreen_status ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, prescreen_status: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <Input
                      data-testid="input-location"
                      value={editedPrescreen.location ?? selectedPrescreen.location ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Assigned Staff</label>
                    <Input
                      data-testid="input-assigned-staff"
                      value={editedPrescreen.assigned_staff ?? selectedPrescreen.assigned_staff ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, assigned_staff: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Eligibility Status</label>
                    <Input
                      data-testid="input-eligibility-status"
                      value={editedPrescreen.eligibility_status ?? selectedPrescreen.eligibility_status ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, eligibility_status: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Scheduled Date/Time</label>
                    <Input
                      data-testid="input-scheduled"
                      value={editedPrescreen.scheduled_datetime ?? selectedPrescreen.scheduled_datetime ?? ""}
                      onChange={(e) => setEditedPrescreen({ ...editedPrescreen, scheduled_datetime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <Input
                    data-testid="input-notes"
                    value={editedPrescreen.notes ?? selectedPrescreen.notes ?? ""}
                    onChange={(e) => setEditedPrescreen({ ...editedPrescreen, notes: e.target.value })}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Additional Information</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Patient UUID:</span>
                      <p className="font-mono text-xs mt-1">{selectedPrescreen.patient_uuid}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prescreen ID:</span>
                      <p className="font-mono text-xs mt-1">{selectedPrescreen.prescreen_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="mt-1">{selectedPrescreen.created_at || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <p className="mt-1">{selectedPrescreen.updated_at || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[calc(100vh-18rem)] flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <ClipboardList className="h-12 w-12 mx-auto opacity-50" />
                <p>Select a prescreen to view details</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
