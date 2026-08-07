import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Heart,
  Loader2,
  LogOut,
  Settings as SettingsIcon,
  BookText,
  History,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { useRecentReads, useBookmarks, useMyStories } from "@/hooks/useStories";
import { supabase } from "@/integrations/supabase/client";
import { removeMedia, uploadMedia } from "@/services/uploadService";
import { StorySlider } from "@/components/story/StorySlider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your profile — Buklat" },
      { name: "description", content: "Manage your pen name, avatar, bio and author profile." },
      { property: "og:title", content: "Your profile — Buklat" },
      { property: "og:description", content: "Manage your pen name, avatar and bio." },
    ],
  }),
  component: Account,
});

function Account() {
  const { profile, userId, session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  useRealtime(["profiles"], { filter: userId ? `id=eq.${userId}` : undefined, enabled: !!userId });

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const recentReads = useRecentReads(userId);
  const bookmarks = useBookmarks(userId);
  const myStories = useMyStories(userId);
  const publishedStories = myStories.data?.filter((s) => s.status === "published");

  const stats = useQuery({
    queryKey: ["author-stats", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("id,status")
        .eq("author_id", userId!);
      if (error) throw new Error(error.message);
      const ids = (stories ?? []).map((s) => s.id);
      let likes = 0;
      if (ids.length) {
        const { count } = await supabase
          .from("story_likes")
          .select("*", { count: "exact", head: true })
          .in("story_id", ids);
        likes = count ?? 0;
      }
      return {
        total: stories?.length ?? 0,
        published: (stories ?? []).filter((s) => s.status === "published").length,
        likes,
      };
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const handle = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    if (handle.length < 3) {
      toast.error("Usernames need at least 3 letters, numbers or underscores.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: handle,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That username is taken." : error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file || !userId) return;
    setUploading(true);
    try {
      const previous = profile?.avatar_url ?? null;
      const url = await uploadMedia("avatars", userId, file, "avatar");
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (error) throw new Error(error.message);
      void removeMedia("avatars", previous);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.display_name ?? profile?.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-10 pb-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card/40 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[5.5rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <header className="relative flex items-start justify-between gap-4 p-5 pt-10">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar className="size-20 border shadow-sm">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                <AvatarFallback className="font-display text-lg">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 rounded-full border bg-background p-1.5 shadow-sm hover:bg-muted"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onAvatar(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="truncate font-display text-[1.4rem] font-bold leading-none text-primary">
                {profile?.display_name || profile?.username || "Your profile"}
              </h1>
              <p className="truncate text-sm text-muted-foreground mt-1">
                @{profile?.username ?? "…"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
              {profile?.bio && (
                <p className="mt-2 text-[0.9rem] leading-relaxed line-clamp-3">{profile.bio}</p>
              )}
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 rounded-full px-4 text-xs font-semibold bg-background/80 backdrop-blur-sm"
              >
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-display">Edit Profile</DialogTitle>
                <DialogDescription>Update your public profile details and bio.</DialogDescription>
              </DialogHeader>
              <form className="space-y-5 pt-2" onSubmit={save}>
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="penname"
                    className="bg-muted/50 border-transparent focus-visible:bg-transparent"
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Lowercase letters, numbers and underscores.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="dn"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Display name
                  </Label>
                  <Input
                    id="dn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-muted/50 border-transparent focus-visible:bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="bio"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    maxLength={400}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A line or two about what you write."
                    className="bg-muted/50 border-transparent focus-visible:bg-transparent resize-none"
                  />
                  <p className="text-right text-[0.7rem] text-muted-foreground">{bio.length}/400</p>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full h-11 font-semibold"
                >
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Stories", value: stats.data?.total ?? 0, icon: BookText },
          { label: "Published", value: stats.data?.published ?? 0, icon: BookText },
          { label: "Likes", value: stats.data?.likes ?? 0, icon: Heart },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border bg-card/40 backdrop-blur-sm px-4 py-4 text-center shadow-sm transition-all hover:bg-card/60 hover:border-primary/20"
          >
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        {(recentReads.data?.length ?? 0) > 0 && (
          <StorySlider
            title="Recent Reads"
            icon={<History className="size-5" />}
            stories={recentReads.data}
            loading={recentReads.isLoading}
          />
        )}

        {(bookmarks.data?.length ?? 0) > 0 && (
          <StorySlider
            title="Bookmarked"
            icon={<Bookmark className="size-5" />}
            stories={bookmarks.data}
            loading={bookmarks.isLoading}
          />
        )}

        {(publishedStories?.length ?? 0) > 0 && (
          <StorySlider
            title="Author Showcase"
            icon={<Sparkles className="size-5 text-primary" />}
            stories={publishedStories}
            loading={myStories.isLoading}
          />
        )}
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start" asChild>
          <Link to="/settings">
            <SettingsIcon className="size-4" /> Settings
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
