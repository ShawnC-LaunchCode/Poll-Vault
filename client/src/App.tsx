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
import SurveysList from "@/pages/SurveysList";
import Responses from "@/pages/Responses";
import ResponseDetails from "@/pages/ResponseDetails";
import Recipients from "@/pages/Recipients";
import SurveyAnalytics from "@/pages/SurveyAnalytics";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/survey/:identifier" component={SurveyPlayer} />
          {/* Redirect all other routes to landing for unauthenticated users */}
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/surveys" component={SurveysList} />
          <Route path="/surveys/new" component={SurveyBuilder} />
          <Route path="/surveys/:id/edit" component={SurveyBuilder} />
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
    console.error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Configuration Error</h1>
          <p className="text-muted-foreground">
            Google OAuth2 is not properly configured. Please contact the administrator.
          </p>
        </div>
      </div>
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
