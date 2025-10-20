import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import SurveyBuilder from "@/pages/SurveyBuilder";
import SurveyPlayer from "@/pages/SurveyPlayer";
import SurveyPreview from "@/pages/SurveyPreview";
import SurveysList from "@/pages/SurveysList";
import Responses from "@/pages/Responses";
import ResponseDetails from "@/pages/ResponseDetails";
import Recipients from "@/pages/Recipients";
import SurveyAnalytics from "@/pages/SurveyAnalytics";
import SurveyResults from "@/pages/SurveyResults";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Survey response route - available to everyone (authenticated or not) */}
      <Route path="/survey/:identifier" component={SurveyPlayer} />

      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          {/* Redirect all other routes to landing for unauthenticated users */}
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/surveys" component={SurveysList} />
          <Route path="/surveys/new" component={SurveyBuilder} />
          <Route path="/builder/:surveyId" component={SurveyBuilder} />
          <Route path="/builder/:surveyId/preview" component={SurveyPreview} />
          <Route path="/surveys/:id/preview" component={SurveyPreview} />
          <Route path="/surveys/:surveyId/results" component={SurveyResults} />
          <Route path="/surveys/:id/responses" component={Responses} />
          <Route path="/surveys/:id/recipients" component={Recipients} />
          <Route path="/surveys/:surveyId/analytics" component={SurveyAnalytics} />
          <Route path="/responses/:id" component={ResponseDetails} />
          <Route path="/responses" component={Responses} />
          <Route path="/recipients" component={Recipients} />
          <Route path="/analytics" component={Dashboard} />
          {/* 404 for authenticated users only */}
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID environment variable is not set - running in development mode');
    // Allow app to run without Google OAuth in development mode
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
