import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Tag, Users } from "lucide-react";
import type { GlobalRecipient } from "@shared/schema";

interface AddRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  globalRecipients: GlobalRecipient[];
  globalRecipientsLoading: boolean;
  alreadyInSurveyEmails: Set<string>;
  availableTags: string[];
  onAddNew: (recipient: { name: string; email: string; tags: string }, saveToGlobal: boolean) => void;
  onAddFromGlobal: (globalRecipientIds: string[]) => void;
  isAddingNew: boolean;
  isAddingFromGlobal: boolean;
}

export function AddRecipientDialog({
  open,
  onOpenChange,
  globalRecipients,
  globalRecipientsLoading,
  alreadyInSurveyEmails,
  availableTags,
  onAddNew,
  onAddFromGlobal,
  isAddingNew,
  isAddingFromGlobal
}: AddRecipientDialogProps) {
  const [activeTab, setActiveTab] = useState("from-contacts");
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "", tags: "" });
  const [saveToGlobal, setSaveToGlobal] = useState(false);
  const [selectedFromGlobal, setSelectedFromGlobal] = useState<string[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalFilterTag, setGlobalFilterTag] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    setNewRecipient({ name: "", email: "", tags: "" });
    setSaveToGlobal(false);
    setSelectedFromGlobal([]);
    setGlobalSearchTerm("");
    setGlobalFilterTag("");
    setActiveTab("from-contacts");
  };

  const handleAddNew = () => {
    onAddNew(newRecipient, saveToGlobal);
    handleClose();
  };

  const handleAddFromGlobal = () => {
    onAddFromGlobal(selectedFromGlobal);
    handleClose();
  };

  const toggleGlobalRecipient = (id: string) => {
    setSelectedFromGlobal(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const toggleAllGlobal = () => {
    const filtered = getFilteredGlobalRecipients();
    if (selectedFromGlobal.length === filtered.length) {
      setSelectedFromGlobal([]);
    } else {
      setSelectedFromGlobal(filtered.map(r => r.id));
    }
  };

  const getFilteredGlobalRecipients = () => {
    return globalRecipients.filter(recipient => {
      const matchesSearch = !globalSearchTerm ||
        recipient.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
        recipient.email.toLowerCase().includes(globalSearchTerm.toLowerCase());

      const matchesTag = !globalFilterTag || globalFilterTag === "all-tags" ||
        recipient.tags?.some(tag => tag.toLowerCase().includes(globalFilterTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  };

  const filteredGlobalRecipients = getFilteredGlobalRecipients();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    <SelectItem value="all-tags">All Tags</SelectItem>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
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
                ) : filteredGlobalRecipients.length > 0 ? (
                  <>
                    <div className="flex items-center space-x-3 p-2 border-b">
                      <Checkbox
                        checked={selectedFromGlobal.length === filteredGlobalRecipients.length && filteredGlobalRecipients.length > 0}
                        onCheckedChange={toggleAllGlobal}
                        data-testid="checkbox-select-all-global"
                      />
                      <span className="text-sm font-medium">Select All ({filteredGlobalRecipients.length})</span>
                    </div>
                    {filteredGlobalRecipients.map((recipient) => {
                      const alreadyInSurvey = alreadyInSurveyEmails.has(recipient.email.toLowerCase());
                      return (
                        <div
                          key={recipient.id}
                          className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors ${alreadyInSurvey ? 'opacity-50' : ''}`}
                        >
                          <Checkbox
                            checked={selectedFromGlobal.includes(recipient.id)}
                            onCheckedChange={() => toggleGlobalRecipient(recipient.id)}
                            disabled={alreadyInSurvey}
                            data-testid={`checkbox-global-recipient-${recipient.id}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium flex items-center space-x-2">
                              <span>{recipient.name}</span>
                              {alreadyInSurvey && (
                                <Badge variant="secondary" className="text-xs">
                                  Already in survey
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{recipient.email}</div>
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
                      {globalSearchTerm || (globalFilterTag && globalFilterTag !== "all-tags")
                        ? "Try adjusting your search or filter criteria"
                        : "You haven't added any global recipients yet"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-cancel-from-contacts"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFromGlobal}
                  disabled={selectedFromGlobal.length === 0 || isAddingFromGlobal}
                  data-testid="button-add-from-contacts"
                >
                  {isAddingFromGlobal
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
                  onCheckedChange={(checked) => setSaveToGlobal(checked === true)}
                  data-testid="checkbox-save-to-global"
                />
                <label htmlFor="save-to-global" className="text-sm text-foreground cursor-pointer">
                  Add to my global recipient list for future use
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-testid="button-cancel-new-recipient"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddNew}
                  disabled={isAddingNew}
                  data-testid="button-save-new-recipient"
                >
                  {isAddingNew ? "Adding..." : "Add Recipient"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
