import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface GeneratedContent {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

const Gallery = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);

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
      setGallery(data || []);
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

  const handleDownload = (imageUrl: string, prompt: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `markmate-${prompt.substring(0, 20)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_content")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setGallery(gallery.filter((item) => item.id !== id));
      toast({
        title: "Content deleted",
      });
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

  if (gallery.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-secondary rounded-full flex items-center justify-center">
            <Download className="w-12 h-12 text-muted-foreground" />
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
          <p className="text-muted-foreground">
            Your generated content collection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((item) => (
            <Card key={item.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-secondary">
                <img
                  src={item.image_url}
                  alt={item.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.prompt}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(item.image_url, item.prompt)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
