import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import {
  RuntimeErrorBoundary,
  RuntimeErrorFallback,
  normalizeRuntimeError,
} from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthPages } from "./pages/Auth/index.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { SendPage } from "./pages/Send.tsx";
import { ReceivePage } from "./pages/Receive.tsx";
import { TransactionsPage, TransactionDetailPage } from "./pages/Transactions.tsx";
import { SettingsPage } from "./pages/Settings.tsx";
import { ScanPage } from "./pages/Scan.tsx";
import { AdminDashboard } from "./pages/AdminDashboard.tsx";
import LearnMorePage from "./pages/LearnMore.tsx";
import WithdrawPage from "./pages/Withdraw.tsx";

const queryClient = new QueryClient();

const SafeRoute = ({
  children,
  routeName,
}: {
  children: React.ReactNode;
  routeName: string;
}) => {
  const location = useLocation();

  return (
    <RuntimeErrorBoundary
      description="This route failed to render. Navigation is still available, and the error is logged in the console."
      resetKey={`${routeName}:${location.pathname}`}
      scope={`route:${routeName}`}
      title={`${routeName} failed to render`}
    >
      {children}
    </RuntimeErrorBoundary>
  );
};

const AppRoutes = () => {
  const location = useLocation();

  const renderSafeRoute = (routeName: string, element: React.ReactNode) => (
    <SafeRoute routeName={routeName}>{element}</SafeRoute>
  );

  useEffect(() => {
    console.log('[AppRoutes] route hit', { path: location.pathname });
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={renderSafeRoute("Landing", <Index />)} />
      <Route path="/learn-more" element={renderSafeRoute("Learn More", <LearnMorePage />)} />
      <Route path="/login" element={renderSafeRoute("Login Redirect", <Navigate to="/auth/login" replace />)} />
      <Route path="/signup" element={renderSafeRoute("Signup Redirect", <Navigate to="/auth/signup" replace />)} />
      <Route path="/auth/*" element={renderSafeRoute("Auth", <AuthPages />)} />
      <Route
        path="/dashboard"
        element={renderSafeRoute("Dashboard", <ProtectedRoute><Dashboard /></ProtectedRoute>)}
      />
      <Route
        path="/send"
        element={renderSafeRoute("Send", <ProtectedRoute><SendPage /></ProtectedRoute>)}
      />
      <Route
        path="/receive"
        element={renderSafeRoute("Receive", <ProtectedRoute><ReceivePage /></ProtectedRoute>)}
      />
      <Route
        path="/withdraw"
        element={renderSafeRoute("Withdraw", <ProtectedRoute><WithdrawPage /></ProtectedRoute>)}
      />
      <Route
        path="/scan"
        element={renderSafeRoute("Scan", <ProtectedRoute><ScanPage /></ProtectedRoute>)}
      />
      <Route
        path="/transactions"
        element={renderSafeRoute("Transactions", <ProtectedRoute><TransactionsPage /></ProtectedRoute>)}
      />
      <Route
        path="/transactions/:txId"
        element={renderSafeRoute(
          "Transaction Detail",
          <ProtectedRoute><TransactionDetailPage /></ProtectedRoute>,
        )}
      />
      <Route
        path="/settings"
        element={renderSafeRoute("Settings", <ProtectedRoute><SettingsPage /></ProtectedRoute>)}
      />
      <Route
        path="/admin"
        element={renderSafeRoute("Admin", <AdminRoute><AdminDashboard /></AdminRoute>)}
      />
      <Route path="*" element={renderSafeRoute("Not Found", <NotFound />)} />
    </Routes>
  );
};

const AppContent = () => {
  const [globalRuntimeError, setGlobalRuntimeError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("App mounted");

    const handleWindowError = (event: ErrorEvent) => {
      const error = normalizeRuntimeError(event.error ?? event.message);
      console.error("[App] Unhandled window error", error);
      setGlobalRuntimeError(error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = normalizeRuntimeError(event.reason);
      console.error("[App] Unhandled promise rejection", error);
      setGlobalRuntimeError(error);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (globalRuntimeError) {
    return (
      <RuntimeErrorFallback
        description="The app caught an unhandled runtime error outside the normal React render path. The details are shown below."
        error={globalRuntimeError}
        title="Unhandled runtime error"
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <RuntimeErrorBoundary
    description="The main application shell hit a runtime error. This fallback keeps the app visible instead of showing a blank page."
    scope="app"
    title="App failed to render"
  >
    <AppContent />
  </RuntimeErrorBoundary>
);

export default App;
