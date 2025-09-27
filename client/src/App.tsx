import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Recipients from "@/pages/Recipients";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/survey/:token" component={SurveyPlayer} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
