import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, Search, Loader2, FileText, Clock, Beaker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

interface AncillaryCatalogItem {
  ancillary_code: string;
  ancillary_name: string;
  modality?: string;
  category?: string;
  description?: string;
  turnaround_time?: string;
  frequency?: string;
  cpt_code?: string;
  price?: number;
}

interface CatalogResponse {
  ok: boolean;
  data?: AncillaryCatalogItem[];
  error?: string;
}

export function AncillaryDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: catalogResponse, isLoading, error } = useQuery<CatalogResponse>({
    queryKey: ["/api/ancillary/catalog"],
  });

  const catalog = catalogResponse?.data || [];

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const query = searchQuery.toLowerCase();
    return catalog.filter(
      (item) =>
        item.ancillary_name?.toLowerCase().includes(query) ||
        item.ancillary_code?.toLowerCase().includes(query) ||
        item.modality?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
    );
  }, [catalog, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    catalog.forEach((item) => {
      if (item.category) cats.add(item.category);
      else if (item.modality) cats.add(item.modality);
    });
    return Array.from(cats);
  }, [catalog]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading ancillary catalog...</p>
        </div>
      </div>
    );
  }

  if (error || !catalogResponse?.ok) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">Unable to load catalog</h3>
            <p className="text-sm text-muted-foreground">
              {catalogResponse?.error || "Failed to connect to the ancillary catalog. Please try again later."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Beaker className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{catalog.length}</p>
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-sky-600/10">
                <FileText className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-600/10">
                <Activity className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredCatalog.length}</p>
                <p className="text-sm text-muted-foreground">Showing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-violet-600/10">
                <Clock className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Active</p>
                <p className="text-sm text-muted-foreground">Catalog Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Ancillary Service Catalog
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-catalog-search"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-24rem)]">
            <div className="space-y-2">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No services match your search" : "No services in catalog"}
                </div>
              ) : (
                filteredCatalog.map((item, index) => (
                  <div
                    key={item.ancillary_code || index}
                    data-testid={`catalog-item-${item.ancillary_code}`}
                    className="p-4 rounded-lg border bg-card hover-elevate space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Beaker className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.ancillary_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Code: {item.ancillary_code}</span>
                            {item.cpt_code && <span>CPT: {item.cpt_code}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.category && (
                          <Badge variant="outline">{item.category}</Badge>
                        )}
                        {item.modality && !item.category && (
                          <Badge variant="outline">{item.modality}</Badge>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground pl-11">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pl-11">
                      {item.turnaround_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.turnaround_time}
                        </span>
                      )}
                      {item.frequency && (
                        <span>Frequency: {item.frequency}</span>
                      )}
                      {item.price && (
                        <span className="font-medium text-foreground">${item.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
