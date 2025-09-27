import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Survey, Recipient } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Recipients() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
    retry: false,
  });

  const { data: recipients, isLoading: recipientsLoading } = useQuery<Recipient[]>({
    queryKey: ["/api/surveys", id, "recipients"],
    enabled: !!id,
    retry: false,
  });

  // Add recipient mutation
  const addRecipientMutation = useMutation({
    mutationFn: async (recipient: { name: string; email: string }) => {
      return await apiRequest("POST", `/api/surveys/${id}/recipients`, recipient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "recipients"] });
      setNewRecipient({ name: "", email: "" });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    addRecipientMutation.mutate(newRecipient);
  };

  const getSurveyUrl = (token: string) => {
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || window.location.host;
    return `https://${domain}/survey/${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Survey link copied to clipboard",
      });
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={survey ? `Recipients - ${survey.title}` : "Survey Recipients"}
          description="Manage survey recipients and distribution"
          actions={
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-recipient">
                  <i className="fas fa-plus mr-2"></i>
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Recipient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                    <Input
                      placeholder="Enter recipient name"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-recipient-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      placeholder="Enter recipient email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                      data-testid="input-recipient-email"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-recipient"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddRecipient}
                      disabled={addRecipientMutation.isPending}
                      data-testid="button-save-recipient"
                    >
                      {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Summary Stats */}
          {survey && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-total-recipients">
                        {recipients ? recipients.length : 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-users text-primary text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Invitations Sent</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-sent-invitations">
                        {recipients ? recipients.filter((r) => r.sentAt).length : 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-paper-plane text-success text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                      <p className="text-3xl font-bold text-foreground" data-testid="text-response-rate">
                        0%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-percentage text-warning text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recipients List */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipientsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recipients && recipients.length > 0 ? (
                <div className="space-y-4">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground" data-testid={`text-recipient-name-${recipient.id}`}>
                            {recipient.name}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-recipient-email-${recipient.id}`}>
                            {recipient.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={recipient.sentAt ? "default" : "secondary"}>
                          {recipient.sentAt ? "Sent" : "Pending"}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(getSurveyUrl(recipient.token))}
                          data-testid={`button-copy-link-${recipient.id}`}
                        >
                          <i className="fas fa-copy mr-2"></i>
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-users text-muted-foreground text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No recipients yet</h3>
                  <p className="text-muted-foreground mb-4">Add recipients to start distributing your survey</p>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-recipient">
                    <i className="fas fa-plus mr-2"></i>
                    Add First Recipient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
