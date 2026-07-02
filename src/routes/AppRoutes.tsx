import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { GameDetails } from "@/pages/GameDetails";
import { Home } from "@/pages/Home";
import { ImportLibrary } from "@/pages/ImportLibrary";
import { Settings } from "@/pages/Settings";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="games/:gameId" element={<GameDetails />} />
        <Route path="import" element={<ImportLibrary />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
