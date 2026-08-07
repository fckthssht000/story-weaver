import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { clearOfflineData, offlineUsage } from "@/lib/offlineDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { AppTheme, ReaderTheme } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Buklat" },
      {
        name: "description",
        content: "Appearance, reading defaults, sync, offline storage and security.",
      },
      { property: "og:title", content: "Settings — Buklat" },
      { property: "og:description", content: "Appearance, reading, sync and security settings." },
    ],
  }),
  component: SettingsPage,
});

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-4 rounded-lg border bg-card p-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

const APP_THEMES: { id: AppTheme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const READER_THEMES: { id: ReaderTheme; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "sepia", label: "Sepia" },
  { id: "night", label: "Night" },
];

function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const { session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [usage, setUsage] = useState({ stories: 0, chapters: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refreshUsage = () => void offlineUsage().then(setUsage);
  useEffect(refreshUsage, []);
  useEffect(() => setEmail(session?.user.email ?? ""), [session]);

  const changeEmail = async () => {
    if (!email.trim()) return;
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to confirm the new address.");
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy("password");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Password updated");
    }
  };

  const signOutEverywhere = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These apply everywhere in the app, on this device.
        </p>
      </header>

      <Section title="Appearance">
        <Row label="App theme" description="Chrome, lists and forms.">
          <div className="flex gap-1.5">
            {APP_THEMES.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={settings.appTheme === t.id ? "default" : "outline"}
                onClick={() => update({ appTheme: t.id })}
                aria-label={t.label}
              >
                <t.icon className="size-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </Button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Reading" hint="Defaults for every story you open.">
        <Row label="Page theme">
          <div className="flex gap-1.5">
            {READER_THEMES.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={settings.readerTheme === t.id ? "default" : "outline"}
                onClick={() => update({ readerTheme: t.id })}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </Row>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Text size</p>
            <span className="font-display text-sm text-muted-foreground">
              {settings.readerSize}px
            </span>
          </div>
          <Slider
            min={15}
            max={26}
            step={1}
            value={[settings.readerSize]}
            onValueChange={([v]) => update({ readerSize: v ?? 18 })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Line spacing</p>
            <span className="font-display text-sm text-muted-foreground">
              {settings.readerLeading}
            </span>
          </div>
          <Slider
            min={1.4}
            max={2.2}
            step={0.05}
            value={[settings.readerLeading]}
            onValueChange={([v]) => update({ readerLeading: v ?? 1.75 })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Line width</p>
            <span className="font-display text-sm text-muted-foreground">
              {settings.readerWidth}ch
            </span>
          </div>
          <Slider
            min={45}
            max={80}
            step={1}
            value={[settings.readerWidth]}
            onValueChange={([v]) => update({ readerWidth: v ?? 62 })}
          />
        </div>
        <Separator />
        <Row label="Justify text" description="Even right edge, with hyphenation.">
          <Switch
            checked={settings.readerJustify}
            onCheckedChange={(v) => update({ readerJustify: v })}
          />
        </Row>
      </Section>

      <Section title="Sync & data">
        <Row label="Live updates" description="Stream new chapters and edits as they happen.">
          <Switch
            checked={settings.realtimeUpdates}
            onCheckedChange={(v) => update({ realtimeUpdates: v })}
          />
        </Row>
        <Separator />
        <Row label="Sync reading progress" description="Pick up where you left off on any device.">
          <Switch
            checked={settings.syncReadingProgress}
            onCheckedChange={(v) => update({ syncReadingProgress: v })}
          />
        </Row>
        <Separator />
        <Row
          label="Auto-download on read"
          description="Keep every story you open available offline."
        >
          <Switch
            checked={settings.autoDownloadOnRead}
            onCheckedChange={(v) => update({ autoDownloadOnRead: v })}
          />
        </Row>
        <Separator />
        <Row
          label="Offline library"
          description={`${usage.stories} stories · ${usage.chapters} chapters on this device`}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await clearOfflineData();
              refreshUsage();
              qc.invalidateQueries({ queryKey: ["library"] });
              toast.success("Offline library cleared");
            }}
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        </Row>
        <Separator />
        <Row label="Cached data" description="Force a fresh fetch of everything.">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              qc.clear();
              void qc.invalidateQueries();
              toast.success("Cache cleared");
            }}
          >
            Refresh
          </Button>
        </Row>
      </Section>

      <Section title="Writing">
        <Row label="Autosave" description="Save chapters shortly after you stop typing.">
          <Switch checked={settings.autosave} onCheckedChange={(v) => update({ autosave: v })} />
        </Row>
        {settings.autosave ? (
          <>
            <Separator />
            <Row label="Autosave delay">
              <div className="flex gap-1.5">
                {[1000, 2000, 5000].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={settings.autosaveDelay === d ? "default" : "outline"}
                    onClick={() => update({ autosaveDelay: d })}
                  >
                    {d / 1000}s
                  </Button>
                ))}
              </div>
            </Row>
          </>
        ) : null}
      </Section>

      <Section title="Account & security">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button variant="outline" onClick={changeEmail} disabled={busy === "email"}>
              {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : null}
              Update
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <div className="flex gap-2">
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="outline" onClick={changePassword} disabled={busy === "password"}>
              {busy === "password" ? <Loader2 className="size-4 animate-spin" /> : null}
              Change
            </Button>
          </div>
        </div>
        <Separator />
        <Row label="Sign out everywhere" description="Ends the session on all your devices.">
          <Button size="sm" variant="outline" onClick={signOutEverywhere}>
            Sign out
          </Button>
        </Row>
      </Section>

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => {
          reset();
          toast.success("Settings restored to defaults");
        }}
      >
        Reset all settings
      </Button>
    </div>
  );
}
