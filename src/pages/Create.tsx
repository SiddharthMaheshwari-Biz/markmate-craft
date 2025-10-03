import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Create = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasBrandProfile, setHasBrandProfile] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("markmate_brand");
    setHasBrandProfile(!!saved && JSON.parse(saved).name);
  }, []);

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

    setLoading(true);
    setGeneratedImage(null);

    try {
      const brandProfile = JSON.parse(localStorage.getItem("markmate_brand") || "{}");

      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          needFor: prompt,
          brandProfile,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        
        // Save to gallery
        const gallery = JSON.parse(localStorage.getItem("markmate_gallery") || "[]");
        gallery.unshift({
          id: Date.now().toString(),
          prompt,
          imageUrl: data.imageUrl,
          timestamp: Date.now(),
        });
        localStorage.setItem("markmate_gallery", JSON.stringify(gallery.slice(0, 50)));

        toast({
          title: "Content generated successfully!",
          description: "Your brand content is ready",
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
        {/* Header */}
        <div className="text-center space-y-3 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold">Create Content</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Simply describe what you need, and MarkMate will create professional brand content for you
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
