import { Card, CardContent } from "@/components/ui/card";

export function ErrorScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-destructive text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Survey Not Available</h1>
          <p className="text-muted-foreground">
            This survey link is invalid or has expired.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
