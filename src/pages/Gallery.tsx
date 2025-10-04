import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Trash2, ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GeneratedContent {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

const Gallery = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedContent | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadGallery();
  };

  const loadGallery = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("generated_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGeneratedContent(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load gallery",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (content: GeneratedContent) => {
    const link = document.createElement("a");
    link.href = content.image_url;
    link.download = `markmate-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadToTemplate = async () => {
    if (!templateTitle.trim() || !selectedImage) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase
        .from("templates")
        .insert({
          user_id: user.id,
          title: templateTitle,
          image_url: selectedImage.image_url,
          prompt: templateDescription,
          is_public: true,
        });

      if (insertError) throw insertError;

      await supabase.rpc('add_mcoins', {
        _user_id: user.id,
        _amount: 0.5,
        _description: 'Template creation from gallery'
      });

      toast({
        title: "Template created! 🎉",
        description: "You earned 0.5 mCoins!",
      });

      setUploadDialogOpen(false);
      setTemplateTitle("");
      setTemplateDescription("");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_content")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGeneratedContent(generatedContent.filter((item) => item.id !== id));
      toast({ title: "Content deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (generatedContent.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-secondary rounded-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">No content yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Create your first brand content to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Gallery</h1>
          <p className="text-muted-foreground">Your generated content collection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generatedContent.map((content) => (
            <Card key={content.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-secondary">
                <img src={content.image_url} alt={content.prompt} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{content.prompt}</p>
                <div className="flex gap-2">
                  <Button onClick={() => handleDownload(content)} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={() => { setSelectedImage(content); setUploadDialogOpen(true); }} variant="secondary" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                  <Button onClick={() => handleDelete(content.id)} variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload to Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title*</Label>
              <Input id="title" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Template name..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="What's this template for?" />
            </div>
            <Button onClick={handleUploadToTemplate} disabled={uploading || !templateTitle} className="w-full">
              {uploading ? "Uploading..." : "Upload & Earn 0.5 mCoins"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
