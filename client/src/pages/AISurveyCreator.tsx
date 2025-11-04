import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useConfetti } from "@/hooks/useConfetti";

interface GeneratedSurvey {
  id: string;
  title: string;
  description?: string;
  pages?: Array<{
    id: string;
    title: string;
    questions?: Array<{
      id: string;
      title: string;
      type: string;
    }>;
  }>;
}

export default function AISurveyCreator() {
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<GeneratedSurvey | null>(null);
  const [, setLocation] = useLocation();
  const { fire } = useConfetti();

  // Analytics tracking helper
  const track = (name: string, props?: Record<string, any>) => {
    try {
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event: name, data: props || {} })
      }).catch(() => {}); // Silent fail for analytics
    } catch {}
  };

  const generateMutation = useMutation({
    mutationFn: async (data: { topic: string; prompt?: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate", data);
      return await response.json() as GeneratedSurvey;
    },
    onSuccess: (data) => {
      setPreview(data);
      fire("ai");
      track("ai_survey_generated", {
        surveyId: data.id,
        pageCount: data.pages?.length || 0,
        questionCount: data.pages?.reduce((acc, p) => acc + (p.questions?.length || 0), 0) || 0
      });
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) return;

    track("ai_survey_generate_clicked", {
      topicLength: topic.trim().length,
      hasCustomPrompt: !!prompt.trim()
    });

    generateMutation.mutate({
      topic: topic.trim(),
      prompt: prompt.trim() || undefined,
    });
  };

  const acceptAndEdit = () => {
    if (preview?.id) {
      track("ai_survey_accept_edit_clicked", { surveyId: preview.id });
      setLocation(`/builder/${preview.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-bold">AI Survey Creator</h1>
          <p className="text-gray-600 mt-1">
            Describe your survey topic and let AI generate a structured questionnaire
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey Topic</CardTitle>
          <CardDescription>
            Describe what you want to learn. The AI will organize questions into logical pages
            (3-4 questions per topic).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Example: Customer feedback about our mobile app - specifically onboarding experience, navigation, performance, and support interactions"
            className="min-h-[120px] resize-none"
            disabled={generateMutation.isPending}
          />

          <details className="border rounded-lg">
            <summary className="cursor-pointer text-sm font-medium p-3 hover:bg-gray-50">
              Advanced: Custom AI Prompt (Admin)
            </summary>
            <div className="p-3 pt-0">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Optional: Override the default AI prompt with custom instructions"
                className="min-h-[120px] resize-none text-sm"
                disabled={generateMutation.isPending}
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to use the default prompt. Custom prompts affect question style and structure.
              </p>
            </div>
          </details>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || generateMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Survey
                </>
              )}
            </Button>

            {preview && (
              <Button
                onClick={acceptAndEdit}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept & Edit
              </Button>
            )}
          </div>

          {generateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : "Failed to generate survey. Please try again."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Generated Survey Preview
              </CardTitle>
              <CardDescription>
                Review the generated survey structure. Click "Accept & Edit" to customize it further.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{preview.title}</h3>
                  {preview.description && (
                    <p className="text-gray-600 mt-1">{preview.description}</p>
                  )}
                </div>

                {preview.pages && preview.pages.length > 0 && (
                  <div className="space-y-3">
                    {preview.pages.map((page, pageIndex) => (
                      <Card key={page.id} className="bg-gray-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Page {pageIndex + 1}: {page.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {page.questions && page.questions.length > 0 ? (
                            <ol className="list-decimal list-inside space-y-2">
                              {page.questions.map((question) => (
                                <li key={question.id} className="text-sm">
                                  {question.title}{" "}
                                  <span className="text-gray-500">
                                    ({question.type.replace(/_/g, " ")})
                                  </span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-sm text-gray-500">No questions</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Total: {preview.pages?.length || 0} pages,{" "}
                    {preview.pages?.reduce((acc, p) => acc + (p.questions?.length || 0), 0) || 0}{" "}
                    questions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
