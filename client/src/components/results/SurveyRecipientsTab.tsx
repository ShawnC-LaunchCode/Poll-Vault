import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCcw, Send, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecipientStatus {
  id: string;
  name: string;
  email: string;
  token: string;
  sentAt: Date | null;
  reminderSentAt: Date | null;
  status: 'not_started' | 'in_progress' | 'complete';
  responseId?: string;
  completedAt?: Date;
}

interface SurveyRecipientsTabProps {
  surveyId: string;
}

export function SurveyRecipientsTab({ surveyId }: SurveyRecipientsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasShownConfetti, setHasShownConfetti] = useState(false);

  // Fetch recipient status with live updates every 15 seconds
  const { data: recipients = [], isLoading } = useQuery<RecipientStatus[]>({
    queryKey: [`/api/surveys/${surveyId}/recipients/status`],
    enabled: !!surveyId,
    refetchInterval: 15000, // Live refresh every 15 seconds
  });

  // Send invitations mutation
  const sendInvitations = useMutation({
    mutationFn: async () => {
      const recipientIds = recipients.filter(r => !r.sentAt).map(r => r.id);
      const response = await fetch(`/api/surveys/${surveyId}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientIds })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitations');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitations sent",
        description: data.message || "Emails are on their way.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}/recipients/status`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send reminder mutation
  const sendReminder = useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await fetch(`/api/recipients/${recipientId}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reminder');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "Recipient notified successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}/recipients/status`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reminder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate statistics
  const sent = recipients.length;
  const complete = recipients.filter(r => r.status === 'complete').length;
  const inProgress = recipients.filter(r => r.status === 'in_progress').length;
  const notStarted = recipients.filter(r => r.status === 'not_started').length;
  const percent = sent > 0 ? Math.round((complete / sent) * 100) : 0;

  // Trigger confetti when 100% complete
  useEffect(() => {
    if (percent === 100 && sent > 0 && !hasShownConfetti) {
      confetti({
        particleCount: 200,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
      });
      toast({
        title: "🎉 All responses complete!",
        description: "Every recipient has finished their survey.",
      });
      setHasShownConfetti(true);
    }
  }, [percent, sent, hasShownConfetti, toast]);

  // Reset confetti flag when percentage drops
  useEffect(() => {
    if (percent < 100) {
      setHasShownConfetti(false);
    }
  }, [percent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-lg font-medium">No recipients yet</p>
        <p className="text-sm mb-4">Add recipients or groups to begin collecting responses.</p>
        <Button onClick={() => window.location.href = `/surveys/${surveyId}/recipients`}>
          Add Recipients
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: RecipientStatus['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const getStatusLabel = (status: RecipientStatus['status']) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  return (
    <div className="space-y-6">
      {/* Distribution Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Distribution Summary</CardTitle>
            <div className="text-sm text-muted-foreground">{percent}% Complete</div>
          </div>
          {recipients.some(r => !r.sentAt) && (
            <Button
              onClick={() => sendInvitations.mutate()}
              disabled={sendInvitations.isPending}
              size="sm"
            >
              {sendInvitations.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitations
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-green-500 h-full transition-all duration-700 ease-out"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {complete}/{sent}
            </span>
          </div>
          <div className="flex gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>Sent: {sent}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Not Started: {notStarted}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>In Progress: {inProgress}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Completed: {complete}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Sent</th>
                  <th className="p-3 text-left font-medium">Last Reminded</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {recipients.map((recipient) => (
                    <motion.tr
                      key={recipient.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="p-3">{recipient.name}</td>
                      <td className="p-3">{recipient.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recipient.status)}`}>
                          {getStatusLabel(recipient.status)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {recipient.sentAt ? new Date(recipient.sentAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {recipient.reminderSentAt ? new Date(recipient.reminderSentAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 text-right">
                        {recipient.status !== 'complete' && recipient.sentAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder.mutate(recipient.id)}
                            disabled={sendReminder.isPending}
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" />
                            Remind
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
