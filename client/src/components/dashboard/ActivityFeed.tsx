import { formatDistance } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { History, ExternalLink, PlusCircle, PlayCircle, Mail, Lock, Circle } from "lucide-react";
import type { ActivityItem } from "@shared/schema";

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'survey_created':
        return <PlusCircle className="h-4 w-4 text-success" />;
      case 'survey_published':
        return <PlayCircle className="h-4 w-4 text-primary" />;
      case 'response_received':
        return <Mail className="h-4 w-4 text-accent" />;
      case 'survey_closed':
        return <Lock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'survey_created':
        return 'bg-success/10 border-success/20';
      case 'survey_published':
        return 'bg-primary/10 border-primary/20';
      case 'response_received':
        return 'bg-accent/10 border-accent/20';
      case 'survey_closed':
        return 'bg-muted border-border';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <History className="mr-2 h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
            <ExternalLink className="mr-1 h-3 w-3" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors hover:bg-accent/50 ${getActivityColor(activity.type)}`}
                data-testid={`activity-item-${activity.id}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-foreground line-clamp-1" data-testid={`activity-title-${activity.id}`}>
                        {activity.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`activity-description-${activity.id}`}>
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true })}
                      </p>
                    </div>
                    {activity.surveyId && (
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        {activity.responseId && (
                          <Link href={`/responses/${activity.responseId}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-response-${activity.id}`}>
                              <i className="fas fa-eye text-xs"></i>
                            </Button>
                          </Link>
                        )}
                        <Link href={`/builder/${activity.surveyId}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-survey-${activity.id}`}>
                            <i className="fas fa-external-link-alt text-xs"></i>
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-history text-muted-foreground text-2xl"></i>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No recent activity</h3>
            <p className="text-muted-foreground mb-4">Your activity will appear here as you create surveys and receive responses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}