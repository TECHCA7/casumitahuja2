import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const ClientDocuments = lazy(() => import("./pages/ClientDocuments"));
const TaxCalculator = lazy(() => import("./pages/TaxCalculator"));
const Billing = lazy(() => import("./pages/Billing"));
const ProjectReport = lazy(() => import("./pages/ProjectReport"));
const PDFTools = lazy(() => import("./pages/PDFTools"));
const OCR = lazy(() => import("./pages/OCR"));
const NoticeReply = lazy(() => import("./pages/NoticeReply"));
const OfficeTasks = lazy(() => import("./pages/OfficeTasks"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ErrorBoundary>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/client-portal" element={<ClientPortal />} />
                  
                  {/* Protected Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/documents" element={<ClientDocuments />} />
                    <Route path="/tax-calculator" element={<TaxCalculator />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/project-report" element={<ProjectReport />} />
                    <Route path="/pdf-tools" element={<PDFTools />} />
                    <Route path="/ocr" element={<OCR />} />
                    <Route path="/notice-reply" element={<NoticeReply />} />
                    <Route path="/office-tasks" element={<OfficeTasks />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
