import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Response } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, Globe, Search, Eye, X } from "lucide-react";

interface IndividualResponsesProps {
  surveyId: string;
}

export function IndividualResponses({ surveyId }: IndividualResponsesProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);

  const { data: responses, isLoading } = useQuery<Response[]>({
    queryKey: [`/api/surveys/${surveyId}/responses`],
    enabled: !!surveyId,
    retry: false,
  });

  // Filter responses based on search and status
  const filteredResponses = responses?.filter((response) => {
    const matchesSearch = !searchTerm ||
      response.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && response.completed) ||
      (statusFilter === "in_progress" && !response.completed);

    return matchesSearch && matchesStatus;
  }) || [];

  const handleViewDetails = (responseId: string) => {
    setLocation(`/responses/${responseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Responses Yet</h3>
            <p className="text-sm text-muted-foreground">
              Responses will appear here once people start completing your survey.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = responses.filter(r => r.completed).length;
  const anonymousCount = responses.filter(r => r.isAnonymous).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{responses.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{completedCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Anonymous</p>
                <p className="text-2xl font-bold text-foreground">{anonymousCount}</p>
              </div>
              <Globe className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by response ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Responses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Individual Responses ({filteredResponses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Response ID</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Submitted</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((response) => (
                  <tr key={response.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded">
                        {response.id.slice(-8)}
                      </code>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={response.isAnonymous ? "bg-green-50 text-green-700 border-green-200" : ""}
                      >
                        {response.isAnonymous ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Anonymous
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Token
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-foreground">
                      {response.submittedAt
                        ? new Date(response.submittedAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-3">
                      <Badge variant={response.completed ? "default" : "secondary"}>
                        {response.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(response.id)}
                        className="h-8 text-xs sm:text-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredResponses.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No responses match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
