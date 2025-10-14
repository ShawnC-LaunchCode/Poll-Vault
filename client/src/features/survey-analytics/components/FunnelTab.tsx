import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import type { CompletionFunnelData } from "@shared/schema";

interface FunnelTabProps {
  funnelData: CompletionFunnelData[];
}

export function FunnelTab({ funnelData }: FunnelTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track how respondents progress through your survey pages
        </p>
      </CardHeader>
      <CardContent>
        {funnelData.length > 0 ? (
          <div className="space-y-4">
            {funnelData.map((step, index) => {
              const previousStep = index > 0 ? funnelData[index - 1] : null;
              const dropOffFromPrevious = previousStep
                ? Math.round(((previousStep.entrances - step.entrances) / previousStep.entrances) * 100)
                : 0;

              return (
                <div key={step.pageId} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {step.pageOrder}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium">{step.pageTitle}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{step.entrances} entrances</span>
                      <span>{step.completions} completions</span>
                      <Badge variant={step.dropOffRate > 30 ? "destructive" : step.dropOffRate > 15 ? "secondary" : "default"}>
                        {step.dropOffRate}% drop-off
                      </Badge>
                      {index > 0 && (
                        <Badge variant="outline">
                          {dropOffFromPrevious}% from previous
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${100 - step.dropOffRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Target className="h-16 w-16 mb-4 opacity-50 mx-auto" />
              <p>No funnel data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
