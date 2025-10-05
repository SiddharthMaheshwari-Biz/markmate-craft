import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Palette, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BrandProfile {
  name: string;
  color: string;
  logo: string;
  voice: string;
  mission: string;
  tagline: string;
  industry: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

interface BrandOnboardingProps {
  onComplete: (profile: BrandProfile) => void;
}

export const BrandOnboarding = ({ onComplete }: BrandOnboardingProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<BrandProfile>({
    name: "",
    color: "#8B5CF6",
    logo: "",
    voice: "",
    mission: "",
    tagline: "",
    industry: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  });

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

  const handleNext = () => {
    if (step === 1 && !profile.name.trim()) {
      toast({
        title: "Brand name required",
        description: "Please enter your brand name",
        variant: "destructive",
      });
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("markmate_brand", JSON.stringify(profile));
    toast({
      title: "Welcome to MarkMate! 🎉",
      description: "Your brand profile is set up. Let's create amazing content!",
    });
    onComplete(profile);
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="p-8 shadow-xl animate-in fade-in-50 duration-300">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-2">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold">Let's Set Up Your Brand</h2>
                <p className="text-muted-foreground">
                  Tell us about your brand so we can create personalized content
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name *</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Enter your brand name"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
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
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Visual Identity */}
        {step === 2 && (
          <Card className="p-8 shadow-xl animate-in fade-in-50 duration-300">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Visual Identity</h2>
                <p className="text-muted-foreground">
                  Choose your brand colors and upload your logo
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Brand Logo</Label>
                  <div className="flex items-center gap-4">
                    {profile.logo && (
                      <img
                        src={profile.logo}
                        alt="Logo preview"
                        className="w-24 h-24 object-contain rounded-lg bg-secondary"
                      />
                    )}
                    <label htmlFor="logo-upload" className="cursor-pointer flex-1">
                      <div className="flex items-center justify-center gap-2 px-4 py-8 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors border-2 border-dashed border-border">
                        <Upload className="w-5 h-5" />
                        <span className="font-medium">
                          {profile.logo ? "Change Logo" : "Upload Logo"}
                        </span>
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
                  <Label htmlFor="color">Primary Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-border shadow-sm cursor-pointer"
                      style={{ backgroundColor: profile.color }}
                      onClick={() => document.getElementById("color")?.click()}
                    />
                    <Input
                      id="color"
                      type="color"
                      value={profile.color}
                      onChange={(e) => setProfile({ ...profile, color: e.target.value })}
                      className="h-16 flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice">Brand Voice</Label>
                  <Input
                    id="voice"
                    value={profile.voice}
                    onChange={(e) => setProfile({ ...profile, voice: e.target.value })}
                    placeholder="E.g., Professional, Playful, Witty, Inspiring"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Brand Story */}
        {step === 3 && (
          <Card className="p-8 shadow-xl animate-in fade-in-50 duration-300">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-2">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold">Tell Your Story</h2>
                <p className="text-muted-foreground">
                  Help us understand your brand's mission and values
                </p>
              </div>

              <div className="space-y-4">
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
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              onClick={() => setStep(step - 1)}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1"
            size="lg"
          >
            {step === totalSteps ? "Complete Setup" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};
