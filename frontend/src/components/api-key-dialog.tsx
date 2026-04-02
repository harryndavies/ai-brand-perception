import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function ApiKeyDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const saveMutation = useMutation({
    mutationFn: () => api.auth.setApiKey(key),
    onSuccess: () => {
      if (user) setUser({ ...user, has_api_key: true });
      setKey("");
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.auth.deleteApiKey(),
    onSuccess: () => {
      if (user) setUser({ ...user, has_api_key: false });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anthropic API Key</DialogTitle>
          <DialogDescription>
            Your key is encrypted and stored securely. It is only used to run analyses on your behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {user?.has_api_key && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">Key saved</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key">
              {user?.has_api_key ? "Replace key" : "API key"}
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-ant-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            disabled={!key.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving..." : "Save Key"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
