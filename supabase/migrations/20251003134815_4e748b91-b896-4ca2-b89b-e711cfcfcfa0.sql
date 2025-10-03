-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  is_public BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Public templates are viewable by everyone"
  ON public.templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);

-- Tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone"
  ON public.tags FOR SELECT
  USING (true);

-- Template tags junction table
CREATE TABLE public.template_tags (
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tag_id)
);

ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template tags are viewable by everyone"
  ON public.template_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can manage tags for own templates"
  ON public.template_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.templates
      WHERE templates.id = template_id AND templates.user_id = auth.uid()
    )
  );

-- Generated content table for gallery
CREATE TABLE public.generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content"
  ON public.generated_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content"
  ON public.generated_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON public.generated_content FOR DELETE
  USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('inspiration-images', 'inspiration-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-content', 'generated-content', true);

-- Storage policies for inspiration images
CREATE POLICY "Users can upload inspiration images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspiration-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Inspiration images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspiration-images');

-- Storage policies for template images
CREATE POLICY "Users can upload template images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'template-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Template images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

-- Storage policies for generated content
CREATE POLICY "Users can upload generated content"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Generated content is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-content');

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();