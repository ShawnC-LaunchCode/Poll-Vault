import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleLogin } from "@/components/GoogleLogin";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-poll text-primary-foreground text-sm"></i>
              </div>
              <span className="text-xl font-bold text-foreground">Poll Vault</span>
            </div>
            <GoogleLogin data-testid="button-login" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-6xl">
            Create Powerful Surveys
            <span className="text-primary"> Made Simple</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
            Build, distribute, and analyze surveys with ease. Our platform makes it simple to gather insights 
            from your audience with beautiful, mobile-responsive surveys.
          </p>
          <div className="mt-10">
            <div className="flex justify-center">
              <GoogleLogin data-testid="button-get-started" />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-edit text-primary text-xl"></i>
              </div>
              <CardTitle>Easy Survey Builder</CardTitle>
              <CardDescription>
                Drag-and-drop interface with multiple question types including text, multiple choice, and more.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-mobile-alt text-success text-xl"></i>
              </div>
              <CardTitle>Mobile Responsive</CardTitle>
              <CardDescription>
                Beautiful surveys that work perfectly on all devices with a seamless mobile experience.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-bar text-warning text-xl"></i>
              </div>
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Get instant insights with real-time response tracking and comprehensive analytics dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
