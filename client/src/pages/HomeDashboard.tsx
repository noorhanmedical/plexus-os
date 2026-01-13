import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Heart, TrendingUp } from "lucide-react";

export function HomeDashboard() {

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Sparkles className="h-5 w-5 text-slate-300" />
              Daily Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">No scheduled appointments</p>
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <Heart className="h-5 w-5 text-slate-300" />
              Ancillary Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">No ancillary services pending</p>
          </CardContent>
        </Card>

        <Card className="glow-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-5 rounded-t-lg" style={{ backgroundColor: "#1a0a28" }}>
            <CardTitle className="text-xl font-medium flex items-center gap-3 text-white">
              <TrendingUp className="h-5 w-5 text-slate-300" />
              Finance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center py-8">No finance data available</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
