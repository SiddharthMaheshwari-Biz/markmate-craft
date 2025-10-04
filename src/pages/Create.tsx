import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, AlertCircle, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CreditsDisplay } from "@/components/CreditsDisplay";

const Create = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasBrandProfile, setHasBrandProfile] = useState(false);
  const [inspirationImage, setInspirationImage] = useState<File | null>(null);
  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [campaignBlueprint, setCampaignBlueprint] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchUserCredits();
    const saved = localStorage.getItem("markmate_brand");
    setHasBrandProfile(!!saved && JSON.parse(saved).name);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(profileData);
  };

  const fetchUserCredits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      setUserCredits(data.credits);
    }
  };

  const handleInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInspirationImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setInspirationPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeInspirationImage = () => {
    setInspirationImage(null);
    setInspirationPreview(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe what content you'd like to create",
        variant: "destructive",
      });
      return;
    }

    if (!hasBrandProfile) {
      toast({
        title: "Brand profile required",
        description: "Please set up your brand profile first",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to generate content",
        variant: "destructive",
      });
      return;
    }

    if (userCredits < 1) {
      toast({
        title: "Insufficient credits",
        description: "You need 1 credit to generate a campaign. Purchase more credits to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratedImage(null);
    setCampaignBlueprint(null);

    try {
      const brandProfile = JSON.parse(localStorage.getItem("markmate_brand") || "{}");
      
      let inspirationImageUrl = null;
      
      // Upload inspiration image if provided
      if (inspirationImage) {
        const fileExt = inspirationImage.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("inspiration-images")
          .upload(fileName, inspirationImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("inspiration-images")
          .getPublicUrl(fileName);
        
        inspirationImageUrl = publicUrl;
      }

      // Call the new orchestrator function with Agency X multi-agent system
      const { data, error } = await supabase.functions.invoke("orchestrate-campaign", {
        body: {
          raw_user_input: prompt,
          user_settings: {
            ...brandProfile,
            enable_contact_strip: profile?.subscription_tier !== 'free'
          },
          user_id: user.id,
          inspiration_image_url: inspirationImageUrl,
        },
      });

      if (error) {
        if (error.message.includes('Insufficient credits')) {
          toast({
            title: "Insufficient credits",
            description: "You need 1 credit to generate a campaign.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.generatedImageUrl) {
        setGeneratedImage(data.generatedImageUrl);
        setCampaignBlueprint(data);
        
        // Save to database
        const { error: insertError } = await supabase
          .from("generated_content")
          .insert({
            user_id: user.id,
            prompt,
            image_url: data.generatedImageUrl,
          });

        if (insertError) {
          console.error("Failed to save to gallery:", insertError);
        }

        // Refresh credits
        fetchUserCredits();

        toast({
          title: "Campaign generated successfully!",
          description: "Your marketing campaign is ready",
        });
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `markmate-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Credits Display */}
        <CreditsDisplay />
        {/* Header */}
        <div className="text-center space-y-3 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold">
            Welcome back{profile?.username ? `, ${profile.username}` : ""}!
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Ready to start a new campaign? Describe your marketing content idea below
          </p>
        </div>

        {!hasBrandProfile && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Brand profile required</p>
                <p className="text-sm text-muted-foreground">
                  Please set up your brand profile in the Brand tab before generating content
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Input Section */}
        <Card className="p-6 shadow-md">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Diwali greeting poster, New product launch announcement, Summer sale offer..."
              className="min-h-[120px] text-base resize-none"
              disabled={loading}
            />

            {/* Inspiration Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="inspiration">Inspiration Image (Optional)</Label>
              {inspirationPreview ? (
                <div className="relative inline-block">
                  <img
                    src={inspirationPreview}
                    alt="Inspiration"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                  />
                  <button
                    onClick={removeInspirationImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="inspiration"
                    type="file"
                    accept="image/*"
                    onChange={handleInspirationUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <label
                    htmlFor="inspiration"
                    className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Upload an image for inspiration
                    </span>
                  </label>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !hasBrandProfile}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Generated Image */}
        {generatedImage && (
          <Card className="p-6 shadow-lg animate-in fade-in-50 duration-500">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Generated Content</h3>
              <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
                <img
                  src={generatedImage}
                  alt="Generated content"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button onClick={handleDownload} className="w-full" variant="outline">
                Download Image
              </Button>
            </div>
          </Card>
        )}

        {/* Example Prompts */}
        <Card className="p-6 bg-secondary/50">
          <h3 className="font-semibold mb-3">Example Prompts</h3>
          <div className="space-y-2">
            {[
              "Diwali wishes poster with festive elements",
              "New product launch announcement with offer details",
              "Weekend sale promotion for clothing brand",
              "Navratri special greeting with traditional vibes",
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setPrompt(example)}
                className="w-full text-left px-4 py-2 rounded-lg bg-background hover:bg-secondary transition-colors text-sm"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Create;
