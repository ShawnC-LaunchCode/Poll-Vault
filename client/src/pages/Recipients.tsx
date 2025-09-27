import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Survey, Recipient, GlobalRecipient } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Users, Mail, Tag, Trash2, Edit3, Plus, Download } from "lucide-react";

export default function Recipients() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Global recipients state
  const [globalRecipient, setGlobalRecipient] = useState({ name: "", email: "", tags: "" });
  const [isGlobalDialogOpen, setIsGlobalDialogOpen] = useState(false);
  const [editingGlobalRecipient, setEditingGlobalRecipient] = useState<GlobalRecipient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [selectedGlobalRecipients, setSelectedGlobalRecipients] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  // Survey-specific recipients state
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "", tags: "" });
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(id || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Enhanced recipient selection state
  const [selectedFromGlobal, setSelectedFromGlobal] = useState<string[]>([]);
  const [saveToGlobal, setSaveToGlobal] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState("from-contacts");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalFilterTag, setGlobalFilterTag] = useState("");
  
  // Active tab - default to global recipients unless we have a specific survey ID
  const [activeTab, setActiveTab] = useState<string>(id ? "survey" : "global");

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

  // Global recipients queries and mutations
  const { data: globalRecipients, isLoading: globalRecipientsLoading } = useQuery<GlobalRecipient[]>({
    queryKey: ["/api/recipients/global"],
    retry: false,
  });

  const createGlobalRecipientMutation = useMutation({
    mutationFn: async (recipient: { name: string; email: string; tags: string }) => {
      const tagsArray = recipient.tags ? recipient.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      return await apiRequest("POST", "/api/recipients/global", {
        name: recipient.name,
        email: recipient.email,
        tags: tagsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      setGlobalRecipient({ name: "", email: "", tags: "" });
      setIsGlobalDialogOpen(false);
      toast({
        title: "Success",
        description: "Global recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  const updateGlobalRecipientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; email: string; tags: string } }) => {
      const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      return await apiRequest("PUT", `/api/recipients/global/${id}`, {
        name: data.name,
        email: data.email,
        tags: tagsArray,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      setEditingGlobalRecipient(null);
      setGlobalRecipient({ name: "", email: "", tags: "" });
      setIsGlobalDialogOpen(false);
      toast({
        title: "Success",
        description: "Global recipient updated successfully",
      });
    },
    onError: handleMutationError,
  });

  const deleteGlobalRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/recipients/global/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      toast({
        title: "Success",
        description: "Global recipient deleted successfully",
      });
    },
    onError: handleMutationError,
  });

  const bulkDeleteGlobalRecipientsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest("DELETE", "/api/recipients/global/bulk", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      setSelectedGlobalRecipients([]);
      setIsBulkDeleteOpen(false);
      toast({
        title: "Success",
        description: "Global recipients deleted successfully",
      });
    },
    onError: handleMutationError,
  });

  // Survey-specific queries and mutations (preserved from original)
  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
    retry: false,
  });

  const { data: allSurveys } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    enabled: !id,
    retry: false,
  });

  const { data: recipients, isLoading: recipientsLoading } = useQuery<Recipient[]>({
    queryKey: ["/api/surveys", selectedSurveyId || id, "recipients"],
    enabled: !!(selectedSurveyId || id),
    retry: false,
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (recipient: { name: string; email: string }) => {
      const surveyId = selectedSurveyId || id;
      if (!surveyId) throw new Error("Please select a survey first");
      return await apiRequest("POST", `/api/surveys/${surveyId}/recipients`, recipient);
    },
    onSuccess: () => {
      const surveyId = selectedSurveyId || id;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      setNewRecipient({ name: "", email: "", tags: "" });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  const bulkAddFromGlobalMutation = useMutation({
    mutationFn: async ({ surveyId, globalRecipientIds }: { surveyId: string; globalRecipientIds: string[] }) => {
      return await apiRequest("POST", `/api/surveys/${surveyId}/recipients/bulk-from-global`, {
        globalRecipientIds
      });
    },
    onSuccess: (data) => {
      const surveyId = selectedSurveyId || id;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      setSelectedFromGlobal([]);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: `Successfully added ${data.addedCount} recipients to survey`,
      });
    },
    onError: handleMutationError,
  });

  const addRecipientWithGlobalSaveMutation = useMutation({
    mutationFn: async ({ recipient, saveToGlobal }: { recipient: { name: string; email: string; tags: string }; saveToGlobal: boolean }) => {
      const surveyId = selectedSurveyId || id;
      if (!surveyId) throw new Error("Please select a survey first");
      
      // First add to survey
      const surveyRecipient = await apiRequest("POST", `/api/surveys/${surveyId}/recipients`, {
        name: recipient.name,
        email: recipient.email
      });
      
      // Then add to global if requested
      if (saveToGlobal) {
        try {
          const tagsArray = recipient.tags ? recipient.tags.split(',').map(t => t.trim()).filter(t => t) : [];
          await apiRequest("POST", "/api/recipients/global", {
            name: recipient.name,
            email: recipient.email,
            tags: tagsArray,
          });
        } catch (error) {
          // Don't fail if global save fails (might be duplicate)
          console.warn("Failed to save to global recipients:", error);
        }
      }
      
      return surveyRecipient;
    },
    onSuccess: () => {
      const surveyId = selectedSurveyId || id;
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "recipients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipients/global"] });
      setNewRecipient({ name: "", email: "", tags: "" });
      setSaveToGlobal(false);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Recipient added successfully",
      });
    },
    onError: handleMutationError,
  });

  function handleMutationError(error: any) {
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
  }

  if (authLoading || !isAuthenticated) {
    return null;
  }

  // Global recipient handlers
  const handleAddGlobalRecipient = () => {
    if (!globalRecipient.name || !globalRecipient.email) {
      toast({
        title: "Error",
        description: "Please fill in name and email fields",
        variant: "destructive",
      });
      return;
    }

    if (editingGlobalRecipient) {
      updateGlobalRecipientMutation.mutate({
        id: editingGlobalRecipient.id,
        data: globalRecipient,
      });
    } else {
      createGlobalRecipientMutation.mutate(globalRecipient);
    }
  };

  const handleEditGlobalRecipient = (recipient: GlobalRecipient) => {
    setEditingGlobalRecipient(recipient);
    setGlobalRecipient({
      name: recipient.name,
      email: recipient.email,
      tags: recipient.tags?.join(', ') || '',
    });
    setIsGlobalDialogOpen(true);
  };

  const handleDeleteGlobalRecipient = (id: string) => {
    deleteGlobalRecipientMutation.mutate(id);
  };

  const handleBulkDelete = () => {
    if (selectedGlobalRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select recipients to delete",
        variant: "destructive",
      });
      return;
    }
    bulkDeleteGlobalRecipientsMutation.mutate(selectedGlobalRecipients);
  };

  const toggleGlobalRecipientSelection = (id: string) => {
    setSelectedGlobalRecipients(prev =>
      prev.includes(id)
        ? prev.filter(recipientId => recipientId !== id)
        : [...prev, id]
    );
  };

  const toggleAllGlobalRecipients = () => {
    if (!globalRecipients) return;
    
    const filteredRecipients = getFilteredGlobalRecipients();
    if (selectedGlobalRecipients.length === filteredRecipients.length) {
      setSelectedGlobalRecipients([]);
    } else {
      setSelectedGlobalRecipients(filteredRecipients.map(r => r.id));
    }
  };

  // Survey-specific handlers (preserved from original)
  const handleAddRecipient = () => {
    if (!selectedSurveyId && !id) {
      toast({
        title: "Error",
        description: "Please select a survey first",
        variant: "destructive",
      });
      return;
    }
    if (!newRecipient.name || !newRecipient.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    addRecipientWithGlobalSaveMutation.mutate({
      recipient: newRecipient,
      saveToGlobal
    });
  };

  const handleBulkAddFromGlobal = () => {
    const surveyId = selectedSurveyId || id;
    if (!surveyId) {
      toast({
        title: "Error",
        description: "Please select a survey first",
        variant: "destructive",
      });
      return;
    }
    if (selectedFromGlobal.length === 0) {
      toast({
        title: "Error",
        description: "Please select recipients to add",
        variant: "destructive",
      });
      return;
    }

    bulkAddFromGlobalMutation.mutate({
      surveyId,
      globalRecipientIds: selectedFromGlobal
    });
  };

  const toggleGlobalRecipientForSurvey = (id: string) => {
    setSelectedFromGlobal(prev =>
      prev.includes(id)
        ? prev.filter(recipientId => recipientId !== id)
        : [...prev, id]
    );
  };

  const toggleAllGlobalRecipientsForSurvey = () => {
    if (!globalRecipients) return;
    
    const filteredRecipients = getFilteredGlobalRecipientsForSurvey();
    if (selectedFromGlobal.length === filteredRecipients.length) {
      setSelectedFromGlobal([]);
    } else {
      setSelectedFromGlobal(filteredRecipients.map(r => r.id));
    }
  };

  const getFilteredGlobalRecipientsForSurvey = () => {
    if (!globalRecipients) return [];
    
    return globalRecipients.filter(recipient => {
      const matchesSearch = !globalSearchTerm || 
        recipient.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(globalSearchTerm.toLowerCase());
      
      const matchesTag = !globalFilterTag || 
        recipient.tags?.some(tag => tag.toLowerCase().includes(globalFilterTag.toLowerCase()));
      
      return matchesSearch && matchesTag;
    });
  };

  const getAlreadyInSurveyEmails = () => {
    if (!recipients) return new Set();
    return new Set(recipients.map(r => r.email.toLowerCase()));
  };

  // Helper functions
  const getFilteredGlobalRecipients = () => {
    if (!globalRecipients) return [];
    
    return globalRecipients.filter(recipient => {
      const matchesSearch = !searchTerm || 
        recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = !filterTag || 
        recipient.tags?.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()));
      
      return matchesSearch && matchesTag;
    });
  };

  const getAllTags = () => {
    if (!globalRecipients) return [];
    const allTags = globalRecipients.flatMap(r => r.tags || []);
    return Array.from(new Set(allTags)).sort();
  };

  const currentSurvey = id ? survey : allSurveys?.find(s => s.id === selectedSurveyId);
  const showSurveySelector = !id && allSurveys && allSurveys.length > 0;
  const filteredGlobalRecipients = getFilteredGlobalRecipients();
  const availableTags = getAllTags();

  const getSurveyUrl = (token: string) => {
    const domain = import.meta.env.VITE_REPLIT_DOMAINS?.split(',')[0] || window.location.host;
    return `https://${domain}/survey/${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={activeTab === "global" ? "Global Recipients" : currentSurvey ? `Recipients - ${currentSurvey.title}` : "Survey Recipients"}
          description={activeTab === "global" ? "Manage your global recipient database" : "Manage survey recipients and distribution"}
          actions={activeTab === "global" ? (
            <div className="flex items-center gap-2">
              {selectedGlobalRecipients.length > 0 && (
                <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" data-testid="button-bulk-delete">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedGlobalRecipients.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Recipients</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedGlobalRecipients.length} selected recipients? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleteGlobalRecipientsMutation.isPending}>
                        {bulkDeleteGlobalRecipientsMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Dialog open={isGlobalDialogOpen} onOpenChange={(open) => {
                setIsGlobalDialogOpen(open);
                if (!open) {
                  setEditingGlobalRecipient(null);
                  setGlobalRecipient({ name: "", email: "", tags: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-global-recipient">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Global Recipient
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingGlobalRecipient ? "Edit Global Recipient" : "Add Global Recipient"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                      <Input
                        placeholder="Enter recipient name"
                        value={globalRecipient.name}
                        onChange={(e) => setGlobalRecipient(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-global-recipient-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                      <Input
                        type="email"
                        placeholder="Enter recipient email"
                        value={globalRecipient.email}
                        onChange={(e) => setGlobalRecipient(prev => ({ ...prev, email: e.target.value }))}
                        data-testid="input-global-recipient-email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Tags (Optional)</label>
                      <Input
                        placeholder="Enter tags separated by commas"
                        value={globalRecipient.tags}
                        onChange={(e) => setGlobalRecipient(prev => ({ ...prev, tags: e.target.value }))}
                        data-testid="input-global-recipient-tags"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use tags to categorize recipients (e.g., "customers, newsletter, beta-users")
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsGlobalDialogOpen(false);
                          setEditingGlobalRecipient(null);
                          setGlobalRecipient({ name: "", email: "", tags: "" });
                        }}
                        data-testid="button-cancel-global-recipient"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddGlobalRecipient}
                        disabled={createGlobalRecipientMutation.isPending || updateGlobalRecipientMutation.isPending}
                        data-testid="button-save-global-recipient"
                      >
                        {(createGlobalRecipientMutation.isPending || updateGlobalRecipientMutation.isPending) 
                          ? (editingGlobalRecipient ? "Updating..." : "Adding...") 
                          : (editingGlobalRecipient ? "Update Recipient" : "Add Recipient")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setSelectedFromGlobal([]);
                setNewRecipient({ name: "", email: "", tags: "" });
                setSaveToGlobal(false);
                setActiveAddTab("from-contacts");
                setGlobalSearchTerm("");
                setGlobalFilterTag("");
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-recipient">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Recipients to Survey</DialogTitle>
                </DialogHeader>
                <Tabs value={activeAddTab} onValueChange={setActiveAddTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="from-contacts" data-testid="tab-from-contacts">
                      From My Contacts
                    </TabsTrigger>
                    <TabsTrigger value="add-new" data-testid="tab-add-new">
                      Add New Recipients
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="from-contacts" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Search recipients..."
                              value={globalSearchTerm}
                              onChange={(e) => setGlobalSearchTerm(e.target.value)}
                              className="pl-10"
                              data-testid="input-search-global-recipients"
                            />
                          </div>
                        </div>
                        <Select value={globalFilterTag} onValueChange={setGlobalFilterTag}>
                          <SelectTrigger className="w-48" data-testid="select-filter-tag">
                            <SelectValue placeholder="Filter by tag" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" data-testid="option-all-tags">All Tags</SelectItem>
                            {getAllTags().map((tag) => (
                              <SelectItem key={tag} value={tag} data-testid={`option-tag-${tag}`}>
                                {tag}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedFromGlobal.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <span className="text-sm font-medium">
                            {selectedFromGlobal.length} recipient{selectedFromGlobal.length !== 1 ? 's' : ''} selected
                          </span>
                          <Button 
                            onClick={() => setSelectedFromGlobal([])}
                            variant="ghost"
                            size="sm"
                            data-testid="button-clear-selection"
                          >
                            Clear Selection
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {globalRecipientsLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
                                <div className="w-4 h-4 bg-muted rounded"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-muted rounded w-40 mb-1"></div>
                                  <div className="h-3 bg-muted rounded w-32"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : getFilteredGlobalRecipientsForSurvey().length > 0 ? (
                          <>
                            <div className="flex items-center space-x-3 p-2 border-b">
                              <Checkbox
                                checked={selectedFromGlobal.length === getFilteredGlobalRecipientsForSurvey().length && getFilteredGlobalRecipientsForSurvey().length > 0}
                                onCheckedChange={toggleAllGlobalRecipientsForSurvey}
                                data-testid="checkbox-select-all-global"
                              />
                              <span className="text-sm font-medium">Select All ({getFilteredGlobalRecipientsForSurvey().length})</span>
                            </div>
                            {getFilteredGlobalRecipientsForSurvey().map((recipient) => {
                              const alreadyInSurvey = getAlreadyInSurveyEmails().has(recipient.email.toLowerCase());
                              return (
                                <div 
                                  key={recipient.id} 
                                  className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors ${alreadyInSurvey ? 'opacity-50' : ''}`}
                                >
                                  <Checkbox
                                    checked={selectedFromGlobal.includes(recipient.id)}
                                    onCheckedChange={() => toggleGlobalRecipientForSurvey(recipient.id)}
                                    disabled={alreadyInSurvey}
                                    data-testid={`checkbox-global-recipient-${recipient.id}`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center space-x-2">
                                      <span data-testid={`text-global-recipient-name-${recipient.id}`}>
                                        {recipient.name}
                                      </span>
                                      {alreadyInSurvey && (
                                        <Badge variant="secondary" className="text-xs">
                                          Already in survey
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground" data-testid={`text-global-recipient-email-${recipient.id}`}>
                                      {recipient.email}
                                    </div>
                                    {recipient.tags && recipient.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {recipient.tags.map((tag) => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            <Tag className="w-3 h-3 mr-1" />
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                              <Users className="text-muted-foreground w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">No global recipients found</h3>
                            <p className="text-muted-foreground mb-4">
                              {globalSearchTerm || globalFilterTag 
                                ? "Try adjusting your search or filter criteria" 
                                : "You haven't added any global recipients yet"}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-from-contacts"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBulkAddFromGlobal}
                          disabled={selectedFromGlobal.length === 0 || bulkAddFromGlobalMutation.isPending}
                          data-testid="button-add-from-contacts"
                        >
                          {bulkAddFromGlobalMutation.isPending 
                            ? "Adding..." 
                            : `Add Selected (${selectedFromGlobal.length})`}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="add-new" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                        <Input
                          placeholder="Enter recipient name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                          data-testid="input-new-recipient-name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                        <Input
                          type="email"
                          placeholder="Enter recipient email"
                          value={newRecipient.email}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                          data-testid="input-new-recipient-email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Tags (Optional)</label>
                        <Input
                          placeholder="Enter tags separated by commas"
                          value={newRecipient.tags}
                          onChange={(e) => setNewRecipient(prev => ({ ...prev, tags: e.target.value }))}
                          data-testid="input-new-recipient-tags"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use tags to categorize recipients (e.g., "customers, newsletter, beta-users")
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="save-to-global"
                          checked={saveToGlobal}
                          onCheckedChange={setSaveToGlobal}
                          data-testid="checkbox-save-to-global"
                        />
                        <label htmlFor="save-to-global" className="text-sm text-foreground cursor-pointer">
                          Add to my global recipient list for future use
                        </label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-new-recipient"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddRecipient}
                          disabled={addRecipientWithGlobalSaveMutation.isPending}
                          data-testid="button-save-new-recipient"
                        >
                          {addRecipientWithGlobalSaveMutation.isPending ? "Adding..." : "Add Recipient"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        />
        
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-recipients">
              <TabsTrigger value="global" data-testid="tab-global-recipients">
                <Users className="w-4 h-4 mr-2" />
                Global Recipients
              </TabsTrigger>
              <TabsTrigger value="survey" data-testid="tab-survey-recipients">
                <Mail className="w-4 h-4 mr-2" />
                Survey Recipients
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6 mt-6">
              {/* Global Recipients Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Global Recipients</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-global-recipients">
                          {globalRecipients ? globalRecipients.length : 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="text-primary w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Unique Tags</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-tags">
                          {availableTags.length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                        <Tag className="text-secondary w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Recent Additions</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-recent-additions">
                          {globalRecipients ? globalRecipients.filter(r => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return r.createdAt && new Date(r.createdAt) > weekAgo;
                          }).length : 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                        <Plus className="text-success w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-global-recipients"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger data-testid="select-filter-tag">
                          <SelectValue placeholder="Filter by tag" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Tags</SelectItem>
                          {availableTags.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Global Recipients List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Global Recipients</CardTitle>
                    {filteredGlobalRecipients.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedGlobalRecipients.length === filteredGlobalRecipients.length}
                          onCheckedChange={toggleAllGlobalRecipients}
                          data-testid="checkbox-select-all-global"
                        />
                        <span className="text-sm text-muted-foreground">Select All</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {globalRecipientsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="w-4 h-4 bg-muted rounded"></div>
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
                  ) : filteredGlobalRecipients.length > 0 ? (
                    <div className="space-y-4">
                      {filteredGlobalRecipients.map((recipient) => (
                        <div key={recipient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={selectedGlobalRecipients.includes(recipient.id)}
                              onCheckedChange={() => toggleGlobalRecipientSelection(recipient.id)}
                              data-testid={`checkbox-recipient-${recipient.id}`}
                            />
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="text-primary w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground" data-testid={`text-global-recipient-name-${recipient.id}`}>
                                {recipient.name}
                              </h3>
                              <p className="text-sm text-muted-foreground" data-testid={`text-global-recipient-email-${recipient.id}`}>
                                {recipient.email}
                              </p>
                              {recipient.tags && recipient.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {recipient.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditGlobalRecipient(recipient)}
                              data-testid={`button-edit-global-${recipient.id}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-delete-global-${recipient.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Global Recipient</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{recipient.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteGlobalRecipient(recipient.id)}
                                    disabled={deleteGlobalRecipientMutation.isPending}
                                  >
                                    {deleteGlobalRecipientMutation.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-muted-foreground w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {searchTerm || filterTag ? "No recipients found" : "No global recipients yet"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || filterTag 
                          ? "Try adjusting your search or filter criteria"
                          : "Build your global recipient database to reuse across surveys"}
                      </p>
                      {!searchTerm && !filterTag && (
                        <Button onClick={() => setIsGlobalDialogOpen(true)} data-testid="button-add-first-global-recipient">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Global Recipient
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="survey" className="space-y-6 mt-6">
              {/* Survey Selector */}
              {showSurveySelector && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Survey</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                        <SelectTrigger data-testid="select-survey">
                          <SelectValue placeholder="Choose a survey to manage recipients" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSurveys?.map((survey) => (
                            <SelectItem key={survey.id} value={survey.id}>
                              {survey.title} ({survey.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!selectedSurveyId && (
                        <p className="text-sm text-muted-foreground">
                          Select a survey above to manage its recipients, or{" "}
                          <Link href="/surveys/new">
                            <a className="text-primary hover:underline">create a new survey</a>
                          </Link>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Survey Recipients Summary Stats */}
              {currentSurvey && (
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
                          <Users className="text-primary w-6 h-6" />
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
                          <Mail className="text-success w-6 h-6" />
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
                          <Download className="text-warning w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Survey Recipients List */}
              {(selectedSurveyId || id) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Survey Recipients</CardTitle>
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
                                <Users className="text-primary w-5 h-5" />
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
                                <Download className="w-4 h-4 mr-2" />
                                Copy Link
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="text-muted-foreground w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">No recipients yet</h3>
                        <p className="text-muted-foreground mb-4">Add recipients to start distributing your survey</p>
                        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-recipient">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Recipient
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}