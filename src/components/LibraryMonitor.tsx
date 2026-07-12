import { useEffect } from "react";
import { libraryMonitorService } from "@/features/library-scanner/library-monitor.service";

export function LibraryMonitor() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    void libraryMonitorService.start().then((cleanup) => {
      stop = cleanup;
    });

    return () => stop?.();
  }, []);

  return null;
}
