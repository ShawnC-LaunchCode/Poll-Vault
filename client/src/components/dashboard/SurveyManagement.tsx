import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import type { Survey, BulkOperationResult } from "@shared/schema";

interface SurveyManagementProps {
  surveys: Survey[];
  isLoading?: boolean;
  onSurveyUpdate?: () => void;
}

export function SurveyManagement({ surveys, isLoading, onSurveyUpdate }: SurveyManagementProps) {
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<string>("");
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicatingSurvey, setDuplicatingSurvey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ surveyIds, operation }: { surveyIds: string[], operation: string }) => {
      if (operation === 'delete') {
        const response = await apiRequest('POST', '/api/surveys/bulk/delete', { surveyIds });
        return await response.json() as BulkOperationResult;
      } else {
        const response = await apiRequest('POST', '/api/surveys/bulk/status', { surveyIds, status: operation });
        return await response.json() as BulkOperationResult;
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Bulk operation completed",
          description: `Successfully updated ${result.updatedCount} surveys`,
        });
        setSelectedSurveys([]);
        setBulkOperation("");
        queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        onSurveyUpdate?.();
      } else {
        toast({
          title: "Bulk operation failed",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to perform bulk operation",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ surveyId, title }: { surveyId: string, title: string }) => {
      const response = await apiRequest('POST', `/api/surveys/${surveyId}/duplicate`, { title });
      return await response.json() as Survey;
    },
    onSuccess: (survey) => {
      toast({
        title: "Survey duplicated",
        description: `"${survey.title}" has been created as a copy`,
      });
      setDuplicateTitle("");
      setDuplicatingSurvey(null);
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onSurveyUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to duplicate survey",
        variant: "destructive",
      });
      setDuplicatingSurvey(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const response = await apiRequest('POST', `/api/surveys/${surveyId}/archive`);
      return await response.json() as Survey;
    },
    onSuccess: (survey) => {
      toast({
        title: "Survey archived",
        description: `"${survey.title}" has been closed`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onSurveyUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to archive survey",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSurveys(surveys.map(s => s.id));
    } else {
      setSelectedSurveys([]);
    }
  };

  const handleSelectSurvey = (surveyId: string, checked: boolean) => {
    if (checked) {
      setSelectedSurveys(prev => [...prev, surveyId]);
    } else {
      setSelectedSurveys(prev => prev.filter(id => id !== surveyId));
    }
  };

  const handleBulkOperation = () => {
    if (selectedSurveys.length === 0 || !bulkOperation) return;
    
    bulkUpdateMutation.mutate({
      surveyIds: selectedSurveys,
      operation: bulkOperation,
    });
  };

  const handleDuplicate = (surveyId: string) => {
    if (!duplicateTitle.trim()) return;
    
    duplicateMutation.mutate({
      surveyId,
      title: duplicateTitle.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'open':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Active</Badge>;
      case 'draft':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Draft</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  <div className="w-10 h-10 bg-muted rounded-lg"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
                <div className="w-20 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <i className="fas fa-cogs mr-2 text-primary"></i>
            Survey Management
          </CardTitle>
          <div className="flex items-center space-x-2">
            {selectedSurveys.length > 0 && (
              <>
                <Select value={bulkOperation} onValueChange={setBulkOperation}>
                  <SelectTrigger className="w-40" data-testid="select-bulk-operation">
                    <SelectValue placeholder="Bulk actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Selected</SelectItem>
                    <SelectItem value="closed">Close Selected</SelectItem>
                    <SelectItem value="delete">Delete Selected</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      disabled={!bulkOperation || bulkUpdateMutation.isPending}
                      data-testid="button-apply-bulk-operation"
                    >
                      {bulkUpdateMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-check mr-2"></i>
                      )}
                      Apply ({selectedSurveys.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Bulk Operation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to {bulkOperation} {selectedSurveys.length} selected survey(s)? 
                        {bulkOperation === 'delete' && ' This action cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkOperation}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {surveys.length > 0 ? (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedSurveys.length === surveys.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm font-medium">
                  {selectedSurveys.length > 0 
                    ? `${selectedSurveys.length} of ${surveys.length} selected`
                    : `Select all ${surveys.length} surveys`
                  }
                </span>
              </div>
              {selectedSurveys.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedSurveys([])}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Survey List */}
            {surveys.map((survey) => (
              <div 
                key={survey.id} 
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-accent/50 ${
                  selectedSurveys.includes(survey.id) ? 'bg-primary/10 border-primary/30' : 'border-border'
                }`}
                data-testid={`survey-management-item-${survey.id}`}
              >
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedSurveys.includes(survey.id)}
                    onCheckedChange={(checked) => handleSelectSurvey(survey.id, !!checked)}
                    data-testid={`checkbox-survey-${survey.id}`}
                  />
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-alt text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground line-clamp-1" data-testid={`text-survey-title-${survey.id}`}>
                      {survey.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {survey.description || "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(survey.status)}
                  
                  <div className="flex items-center space-x-1">
                    <Link href={`/builder/${survey.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-survey-${survey.id}`}>
                        <i className="fas fa-edit"></i>
                      </Button>
                    </Link>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setDuplicatingSurvey(survey.id);
                            setDuplicateTitle(`${survey.title} (Copy)`);
                          }}
                          data-testid={`button-duplicate-survey-${survey.id}`}
                        >
                          <i className="fas fa-copy"></i>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Duplicate Survey</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">New survey title</label>
                            <Input
                              value={duplicateTitle}
                              onChange={(e) => setDuplicateTitle(e.target.value)}
                              placeholder="Enter title for duplicated survey"
                              data-testid="input-duplicate-title"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setDuplicatingSurvey(null)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => handleDuplicate(survey.id)}
                              disabled={!duplicateTitle.trim() || duplicateMutation.isPending}
                              data-testid="button-confirm-duplicate"
                            >
                              {duplicateMutation.isPending ? (
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                              ) : (
                                <i className="fas fa-copy mr-2"></i>
                              )}
                              Duplicate
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {survey.status !== 'closed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-archive-survey-${survey.id}`}>
                            <i className="fas fa-archive"></i>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive Survey</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to close "{survey.title}"? This will stop accepting new responses.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => archiveMutation.mutate(survey.id)}>
                              Archive
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-poll text-muted-foreground text-2xl"></i>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No surveys to manage</h3>
            <p className="text-muted-foreground mb-4">Create your first survey to get started</p>
            <Link href="/surveys/new">
              <Button data-testid="button-create-first-survey-management">
                <i className="fas fa-plus mr-2"></i>
                Create Survey
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}