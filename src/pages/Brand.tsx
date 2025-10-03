import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette } from "lucide-react";

interface BrandProfile {
  name: string;
  color: string;
  logo: string;
  voice: string;
  mission: string;
  tagline: string;
  industry: string;
  description: string;
}

const Brand = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<BrandProfile>({
    name: "",
    color: "#8B5CF6",
    logo: "",
    voice: "",
    mission: "",
    tagline: "",
    industry: "",
    description: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("markmate_brand");
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("markmate_brand", JSON.stringify(profile));
    toast({
      title: "Brand profile saved",
      description: "Your brand details have been updated successfully.",
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Brand Profile</h1>
          <p className="text-muted-foreground">
            Set up your brand identity for AI-powered content creation
          </p>
        </div>

        <Card className="p-6 space-y-6 shadow-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your Brand Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Brand Logo</Label>
              <div className="flex items-center gap-4">
                {profile.logo && (
                  <img
                    src={profile.logo}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain rounded-lg bg-secondary"
                  />
                )}
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload Logo</span>
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Primary Brand Color *</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                  style={{ backgroundColor: profile.color }}
                  onClick={() => document.getElementById("color")?.click()}
                />
                <Input
                  id="color"
                  type="color"
                  value={profile.color}
                  onChange={(e) => setProfile({ ...profile, color: e.target.value })}
                  className="h-12 flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Brand Tagline</Label>
              <Input
                id="tagline"
                value={profile.tagline}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="Your inspiring tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                placeholder="E.g., Fashion, Technology, Food & Beverage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice">Brand Voice</Label>
              <Input
                id="voice"
                value={profile.voice}
                onChange={(e) => setProfile({ ...profile, voice: e.target.value })}
                placeholder="E.g., Professional, Playful, Witty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission">Brand Mission</Label>
              <Textarea
                id="mission"
                value={profile.mission}
                onChange={(e) => setProfile({ ...profile, mission: e.target.value })}
                placeholder="What does your brand stand for?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Brand Description</Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Describe your brand in detail"
                rows={4}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" size="lg">
            Save Brand Profile
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Brand;
