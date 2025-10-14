import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnonymousSettings {
  enabled: boolean;
  accessType: string;
  publicLink?: string;
}

interface AnonymousAccessCardProps {
  surveyId: string | null;
  anonymousSettings: AnonymousSettings;
  isEnabling: boolean;
  isDisabling: boolean;
  onToggle: (enabled: boolean) => void;
  onAccessTypeChange: (accessType: string) => void;
}

export function AnonymousAccessCard({
  surveyId,
  anonymousSettings,
  isEnabling,
  isDisabling,
  onToggle,
  onAccessTypeChange
}: AnonymousAccessCardProps) {
  const { toast } = useToast();

  const copyPublicLink = () => {
    if (anonymousSettings.publicLink) {
      const fullLink = `${window.location.origin}/survey/${anonymousSettings.publicLink}`;
      navigator.clipboard.writeText(fullLink);
      toast({
        title: "Copied!",
        description: "Anonymous survey link copied to clipboard",
      });
    }
  };

  const openPublicLink = () => {
    if (anonymousSettings.publicLink) {
      const fullLink = `${window.location.origin}/survey/${anonymousSettings.publicLink}`;
      window.open(fullLink, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Anonymous Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="anonymous-toggle">Enable Anonymous Access</Label>
            <p className="text-xs text-muted-foreground">
              Allow anyone to take this survey without requiring a recipient token
            </p>
          </div>
          <Switch
            id="anonymous-toggle"
            checked={anonymousSettings.enabled}
            onCheckedChange={onToggle}
            disabled={!surveyId || isEnabling || isDisabling}
            data-testid="switch-anonymous-access"
          />
        </div>

        {anonymousSettings.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="access-type">Response Limitation</Label>
              <Select
                value={anonymousSettings.accessType}
                onValueChange={onAccessTypeChange}
              >
                <SelectTrigger data-testid="select-access-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited responses</SelectItem>
                  <SelectItem value="one_per_ip">One response per IP address</SelectItem>
                  <SelectItem value="one_per_session">One response per browser session</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Control how many times someone can respond to your survey
              </p>
            </div>

            {anonymousSettings.publicLink && (
              <div className="space-y-2">
                <Label>Public Survey Link</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/survey/${anonymousSettings.publicLink}`}
                    className="text-xs"
                    data-testid="input-public-link"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyPublicLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openPublicLink}
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link to allow anonymous responses
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
