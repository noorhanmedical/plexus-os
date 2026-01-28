import { ArrowLeft, ExternalLink, Maximize2, Minimize2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AncillaryPortalProps {
  onBack?: () => void;
}

export function AncillaryPortal({ onBack }: AncillaryPortalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const externalAppUrl = "https://attached-assets--aliimranmd2.replit.app";

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const openInNewTab = () => {
    window.open(externalAppUrl, "_blank");
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-[9999] bg-background' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          )}
          <h2 className="text-lg font-semibold text-foreground">Ancillary Ordering Portal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openInNewTab}
            title="Open in New Tab"
            data-testid="button-open-new-tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 relative">
        {isLoading && !iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <p className="text-muted-foreground">Loading Ordering Portal...</p>
            </div>
          </div>
        )}
        {iframeError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Portal</h3>
              <p className="text-muted-foreground mb-4">
                The ordering portal cannot be displayed here. This may be due to security restrictions.
              </p>
            </div>
            <Button onClick={openInNewTab} className="gap-2" data-testid="button-open-external">
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
        ) : (
          <iframe
            src={externalAppUrl}
            className="w-full h-full border-0"
            title="Ancillary Ordering Portal"
            allow="clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            data-testid="iframe-ancillary-portal"
          />
        )}
      </div>
    </div>
  );
}
