import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — StoryApp" },
      { name: "description", content: "Your pen name, bio and account settings." },
      { property: "og:title", content: "Account — StoryApp" },
      { property: "og:description", content: "Your pen name, bio and account settings." },
    ],
  }),
  component: Account,
});

function Account() {
  const { profile, userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{profile?.username ?? "…"}</p>
      </header>

      <form className="space-y-4" onSubmit={save}>
        <div className="space-y-1.5">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          Save profile
        </Button>
      </form>

      <Button variant="outline" className="w-full" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
