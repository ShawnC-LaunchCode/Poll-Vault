import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUserPresets } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Sparkles, Moon, Sun, Lightbulb, RotateCcw, Download, Upload, Save, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { prefs, isLoading, update, reset, isUpdating, importAsync } = useUserPreferences();
  const { presets, savePreset, applyPreset, deletePreset, isSaving, isApplying, isDeleting } = useUserPresets();
  const { toast } = useToast();
  const [presetName, setPresetName] = useState("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access settings.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const handleToggle = (key: string, value: boolean) => {
    update({ [key]: value });
    toast({
      title: "Preference updated",
      description: `${formatLabel(key)} ${value ? "enabled" : "disabled"}.`,
    });
  };

  const handleDarkModeChange = (value: string) => {
    update({ darkMode: value as "system" | "light" | "dark" });
    toast({
      title: "Theme updated",
      description: `Theme set to ${value}.`,
    });
  };

  const handleReset = () => {
    reset();
    toast({
      title: "Preferences reset",
      description: "All preferences have been reset to defaults.",
    });
  };

  const formatLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pollvault-preferences.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Preferences exported",
      description: "Your preferences have been downloaded as JSON.",
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      await importAsync(imported);
      toast({
        title: "Preferences imported",
        description: "Your preferences have been successfully imported.",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Invalid JSON file or import error.",
        variant: "destructive",
      });
    }
    // Reset file input
    e.target.value = "";
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your preset.",
        variant: "destructive",
      });
      return;
    }

    savePreset(
      { name: presetName, settings: prefs },
      {
        onSuccess: () => {
          setPresetName("");
          toast({
            title: "Preset saved",
            description: `"${presetName}" has been saved successfully.`,
          });
        },
        onError: () => {
          toast({
            title: "Save failed",
            description: "Failed to save preset.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleApplyPreset = (presetId: string, presetName: string) => {
    applyPreset(presetId, {
      onSuccess: () => {
        toast({
          title: "Preset applied",
          description: `"${presetName}" has been applied to your preferences.`,
        });
      },
      onError: () => {
        toast({
          title: "Apply failed",
          description: "Failed to apply preset.",
          variant: "destructive",
        });
      },
    });
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    if (!confirm(`Are you sure you want to delete the preset "${presetName}"?`)) {
      return;
    }

    deletePreset(presetId, {
      onSuccess: () => {
        toast({
          title: "Preset deleted",
          description: `"${presetName}" has been deleted.`,
        });
      },
      onError: () => {
        toast({
          title: "Delete failed",
          description: "Failed to delete preset.",
          variant: "destructive",
        });
      },
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Settings" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Settings" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-8 h-8" />
                  User Preferences
                </h1>
                <p className="text-gray-600 mt-1">
                  Customize your Poll-Vault experience
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode" className="text-base font-medium">
                      Theme
                    </Label>
                    <p className="text-sm text-gray-500">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <select
                    id="darkMode"
                    className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={prefs.darkMode ?? "system"}
                    onChange={(e) => handleDarkModeChange(e.target.value)}
                    disabled={isUpdating}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Celebration & Effects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Celebrations & Effects
                </CardTitle>
                <CardDescription>
                  Control visual celebration effects throughout the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Celebration Effects */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="celebration" className="text-base font-medium">
                      Celebration Effects
                    </Label>
                    <p className="text-sm text-gray-500">
                      Show confetti and animations on achievements
                    </p>
                  </div>
                  <Switch
                    id="celebration"
                    checked={prefs.celebrationEffects ?? true}
                    onCheckedChange={(v) => handleToggle("celebrationEffects", v)}
                    disabled={isUpdating}
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Assistance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Assistance
                </CardTitle>
                <CardDescription>
                  Configure AI-powered features and personalize AI behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Assistance Master Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="aiAssistEnabled" className="text-base font-medium">
                      Enable AI Assistance
                    </Label>
                    <p className="text-sm text-gray-500">
                      Turn on AI-powered features throughout the application
                    </p>
                  </div>
                  <Switch
                    id="aiAssistEnabled"
                    checked={prefs.aiAssistEnabled ?? true}
                    onCheckedChange={(v) => handleToggle("aiAssistEnabled", v)}
                    disabled={isUpdating}
                  />
                </div>

                <div className="border-t pt-4 space-y-6 opacity-100 transition-opacity" style={{ opacity: prefs.aiAssistEnabled ? 1 : 0.5 }}>
                  {/* Auto-suggest Questions */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="aiAutoSuggest" className="text-base font-medium">
                        Auto-suggest Questions
                      </Label>
                      <p className="text-sm text-gray-500">
                        Automatically offer question ideas while editing surveys
                      </p>
                    </div>
                    <Switch
                      id="aiAutoSuggest"
                      checked={prefs.aiAutoSuggest ?? true}
                      onCheckedChange={(v) => handleToggle("aiAutoSuggest", v)}
                      disabled={isUpdating || !prefs.aiAssistEnabled}
                    />
                  </div>

                  {/* AI Tone */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="aiTone" className="text-base font-medium">
                        AI Response Tone
                      </Label>
                      <p className="text-sm text-gray-500">
                        Choose the personality style for AI suggestions
                      </p>
                    </div>
                    <select
                      id="aiTone"
                      className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                      value={prefs.aiTone ?? "friendly"}
                      onChange={(e) => {
                        update({ aiTone: e.target.value as "friendly" | "professional" | "playful" });
                        toast({
                          title: "AI tone updated",
                          description: `AI will now use a ${e.target.value} tone.`,
                        });
                      }}
                      disabled={isUpdating || !prefs.aiAssistEnabled}
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="playful">Playful</option>
                    </select>
                  </div>

                  {/* AI Summary Depth */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="aiSummaryDepth" className="text-base font-medium">
                        Summary Detail Level
                      </Label>
                      <p className="text-sm text-gray-500">
                        Control how detailed AI analytics summaries should be
                      </p>
                    </div>
                    <select
                      id="aiSummaryDepth"
                      className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                      value={prefs.aiSummaryDepth ?? "standard"}
                      onChange={(e) => {
                        update({ aiSummaryDepth: e.target.value as "short" | "standard" | "in-depth" });
                        toast({
                          title: "Summary depth updated",
                          description: `AI summaries will now be ${e.target.value}.`,
                        });
                      }}
                      disabled={isUpdating || !prefs.aiAssistEnabled}
                    >
                      <option value="short">Short</option>
                      <option value="standard">Standard</option>
                      <option value="in-depth">In-Depth</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export/Import & Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Export, Import & Presets
                </CardTitle>
                <CardDescription>
                  Save, share, or restore your preference configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Export/Import */}
                <div>
                  <Label className="text-base font-medium mb-2 block">
                    Export / Import Preferences
                  </Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Download your current preferences as a JSON file, or import a previously saved configuration.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      disabled={isUpdating}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isUpdating}
                      className="flex items-center gap-2"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Import JSON
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={handleImport}
                          className="hidden"
                        />
                      </label>
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  {/* Save as Preset */}
                  <div className="mb-4">
                    <Label className="text-base font-medium mb-2 block">
                      Save Current Settings as Preset
                    </Label>
                    <p className="text-sm text-gray-500 mb-3">
                      Create a named preset from your current preferences for quick switching later.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Preset name (e.g., Playful Creator)"
                        disabled={isSaving}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSavePreset();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSavePreset}
                        disabled={isSaving || !presetName.trim()}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Save className="w-4 h-4" />
                        Save Preset
                      </Button>
                    </div>
                  </div>

                  {/* Load Preset */}
                  {presets && presets.length > 0 && (
                    <div>
                      <Label className="text-base font-medium mb-2 block">
                        Load Saved Presets
                      </Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Apply a previously saved preset configuration.
                      </p>
                      <div className="space-y-2">
                        {presets.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{preset.name}</p>
                              <p className="text-xs text-gray-500">
                                Created {new Date(preset.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPreset(preset.id, preset.name)}
                                disabled={isApplying || isDeleting}
                                className="flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" />
                                Apply
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePreset(preset.id, preset.name)}
                                disabled={isApplying || isDeleting}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {presets && presets.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4 border rounded-lg bg-gray-50">
                      No saved presets yet. Create one above to get started!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Footer */}
            <div className="text-center text-sm text-gray-500 py-4">
              Your preferences are automatically saved and synced across sessions.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
