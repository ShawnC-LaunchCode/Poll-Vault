import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRecipients } from "@/hooks/useRecipients";
import { useRecipientSelection } from "@/hooks/useRecipientSelection";
import { Link } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail } from "lucide-react";
import type { GlobalRecipient } from "@shared/schema";

import {
  RecipientStats,
  SearchFilter,
  GlobalRecipientsList,
  SurveyRecipientsList,
  AddRecipientDialog,
  SendInvitationsDialog,
  GlobalRecipientDialog,
  BulkDeleteDialog
} from "@/features/recipients/components";

export default function Recipients() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(id || "");
  const [activeTab, setActiveTab] = useState<string>(id ? "survey" : "global");

  // Global recipients state
  const [isGlobalDialogOpen, setIsGlobalDialogOpen] = useState(false);
  const [editingGlobalRecipient, setEditingGlobalRecipient] = useState<GlobalRecipient | null>(null);
  const [globalRecipient, setGlobalRecipient] = useState({ name: "", email: "", tags: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Survey recipients state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSendInvitationsDialogOpen, setIsSendInvitationsDialogOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Use custom hooks
  const surveyId = selectedSurveyId || id;
  const {
    survey,
    allSurveys,
    recipients,
    globalRecipients,
    surveyLoading,
    recipientsLoading,
    globalRecipientsLoading,
    addRecipientWithGlobalSave,
    addRecipientWithGlobalSavePending,
    bulkAddFromGlobal,
    bulkAddFromGlobalPending,
    sendInvitations,
    sendInvitationsPending,
    createGlobalRecipient,
    createGlobalRecipientPending,
    updateGlobalRecipient,
    updateGlobalRecipientPending,
    deleteGlobalRecipient,
    deleteGlobalRecipientPending,
    bulkDeleteGlobalRecipients,
    bulkDeleteGlobalRecipientsPending,
  } = useRecipients(surveyId);

  const globalSelection = useRecipientSelection();
  const surveySelection = useRecipientSelection();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  // Helper functions
  const getAllTags = () => {
    if (!globalRecipients) return [];
    const allTags = globalRecipients.flatMap(r => r.tags || []);
    return Array.from(new Set(allTags)).sort();
  };

  const getFilteredGlobalRecipients = () => {
    if (!globalRecipients) return [];
    return globalRecipients.filter(recipient => {
      const matchesSearch = !searchTerm ||
        recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !filterTag || filterTag === "all-tags" ||
        recipient.tags?.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()));
      return matchesSearch && matchesTag;
    });
  };

  const getAlreadyInSurveyEmails = (): Set<string> => {
    if (!recipients) return new Set<string>();
    return new Set(recipients.map(r => r.email.toLowerCase()));
  };

  const getSurveyUrl = (token: string) => {
    const baseUrl = import.meta.env.VITE_BASE_URL || `${window.location.protocol}//${window.location.host}`;
    return `${baseUrl}/survey/${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
    });
  };

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
      updateGlobalRecipient({
        id: editingGlobalRecipient.id,
        data: globalRecipient,
      });
    } else {
      createGlobalRecipient(globalRecipient);
    }

    setGlobalRecipient({ name: "", email: "", tags: "" });
    setEditingGlobalRecipient(null);
    setIsGlobalDialogOpen(false);
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
    deleteGlobalRecipient(id);
  };

  const handleBulkDelete = () => {
    if (globalSelection.count === 0) {
      toast({
        title: "Error",
        description: "Please select recipients to delete",
        variant: "destructive",
      });
      return;
    }
    bulkDeleteGlobalRecipients(globalSelection.selectedIds);
    globalSelection.clear();
    setIsBulkDeleteOpen(false);
  };

  // Survey recipient handlers
  const handleAddRecipient = (
    recipient: { name: string; email: string; tags: string },
    saveToGlobal: boolean
  ) => {
    if (!surveyId) {
      toast({
        title: "Error",
        description: "Please select a survey first",
        variant: "destructive",
      });
      return;
    }
    if (!recipient.name || !recipient.email) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    addRecipientWithGlobalSave({ recipient, saveToGlobal });
  };

  const handleBulkAddFromGlobal = (globalRecipientIds: string[]) => {
    if (!surveyId) {
      toast({
        title: "Error",
        description: "Please select a survey first",
        variant: "destructive",
      });
      return;
    }
    if (globalRecipientIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select recipients to add",
        variant: "destructive",
      });
      return;
    }

    bulkAddFromGlobal({ surveyId, globalRecipientIds });
  };

  const handleSendInvitations = () => {
    if (!surveyId) {
      toast({
        title: "Error",
        description: "Survey not found",
        variant: "destructive",
      });
      return;
    }

    if (surveySelection.count === 0) {
      toast({
        title: "Error",
        description: "Please select recipients to send invitations to",
        variant: "destructive",
      });
      return;
    }

    sendInvitations({
      surveyId,
      recipientIds: surveySelection.selectedIds
    });
    surveySelection.clear();
    setIsSendInvitationsDialogOpen(false);
  };

  const currentSurvey = id ? survey : allSurveys?.find(s => s.id === selectedSurveyId);
  const showSurveySelector = !id && allSurveys && allSurveys.length > 0;
  const filteredGlobalRecipients = getFilteredGlobalRecipients();
  const availableTags = getAllTags();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={activeTab === "global" ? "Global Recipients" : currentSurvey ? `Recipients - ${currentSurvey.title}` : "Survey Recipients"}
          description={activeTab === "global" ? "Manage your global recipient database" : "Manage survey recipients and distribution"}
          actions={activeTab === "global" ? (
            <div className="flex items-center gap-2">
              {globalSelection.count > 0 && (
                <BulkDeleteDialog
                  open={isBulkDeleteOpen}
                  onOpenChange={setIsBulkDeleteOpen}
                  selectedCount={globalSelection.count}
                  onConfirm={handleBulkDelete}
                  isPending={bulkDeleteGlobalRecipientsPending}
                />
              )}
              <GlobalRecipientDialog
                open={isGlobalDialogOpen}
                onOpenChange={(open) => {
                  setIsGlobalDialogOpen(open);
                  if (!open) {
                    setEditingGlobalRecipient(null);
                    setGlobalRecipient({ name: "", email: "", tags: "" });
                  }
                }}
                editingRecipient={editingGlobalRecipient}
                recipientData={globalRecipient}
                onRecipientDataChange={setGlobalRecipient}
                onSave={handleAddGlobalRecipient}
                isSaving={createGlobalRecipientPending || updateGlobalRecipientPending}
              />
            </div>
          ) : (
            <AddRecipientDialog
              open={isAddDialogOpen}
              onOpenChange={setIsAddDialogOpen}
              globalRecipients={globalRecipients || []}
              globalRecipientsLoading={globalRecipientsLoading}
              alreadyInSurveyEmails={getAlreadyInSurveyEmails()}
              availableTags={availableTags}
              onAddNew={handleAddRecipient}
              onAddFromGlobal={handleBulkAddFromGlobal}
              isAddingNew={addRecipientWithGlobalSavePending}
              isAddingFromGlobal={bulkAddFromGlobalPending}
            />
          )}
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto" data-testid="tabs-recipients">
              <TabsTrigger value="global" data-testid="tab-global-recipients" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Global Recipients</span>
                <span className="sm:hidden">Global</span>
              </TabsTrigger>
              <TabsTrigger value="survey" data-testid="tab-survey-recipients" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Survey Recipients</span>
                <span className="sm:hidden">Survey</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              <RecipientStats
                type="global"
                globalRecipients={globalRecipients}
                availableTags={availableTags}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchFilter
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterTag={filterTag}
                    onFilterTagChange={setFilterTag}
                    availableTags={availableTags}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Global Recipients</CardTitle>
                </CardHeader>
                <CardContent>
                  <GlobalRecipientsList
                    recipients={filteredGlobalRecipients}
                    isLoading={globalRecipientsLoading}
                    selectedIds={globalSelection.selectedIds}
                    onToggleSelection={globalSelection.toggle}
                    onToggleAll={() => globalSelection.toggleAll(filteredGlobalRecipients.map(r => r.id))}
                    isAllSelected={globalSelection.isAllSelected(filteredGlobalRecipients.map(r => r.id))}
                    onEdit={handleEditGlobalRecipient}
                    onDelete={handleDeleteGlobalRecipient}
                    isDeleting={deleteGlobalRecipientPending}
                    onAddClick={() => setIsGlobalDialogOpen(true)}
                    searchTerm={searchTerm}
                    filterTag={filterTag}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="survey" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
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

              {currentSurvey && (
                <RecipientStats
                  type="survey"
                  recipients={recipients}
                />
              )}

              {(selectedSurveyId || id) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Survey Recipients</CardTitle>
                      {recipients && recipients.length > 0 && surveySelection.count > 0 && (
                        <SendInvitationsDialog
                          open={isSendInvitationsDialogOpen}
                          onOpenChange={setIsSendInvitationsDialogOpen}
                          selectedCount={surveySelection.count}
                          onConfirm={handleSendInvitations}
                          isPending={sendInvitationsPending}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SurveyRecipientsList
                      recipients={recipients || []}
                      isLoading={recipientsLoading}
                      selectedIds={surveySelection.selectedIds}
                      onToggleSelection={surveySelection.toggle}
                      onToggleAll={() => surveySelection.toggleAll(recipients?.map(r => r.id) || [])}
                      isAllSelected={surveySelection.isAllSelected(recipients?.map(r => r.id) || [])}
                      onCopyLink={copyToClipboard}
                      onAddClick={() => setIsAddDialogOpen(true)}
                      getSurveyUrl={getSurveyUrl}
                    />
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
