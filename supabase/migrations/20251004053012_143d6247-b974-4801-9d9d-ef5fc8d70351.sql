-- Phase 1: Core Infrastructure - Credits, Subscriptions, and Transactions

-- Create enum for subscription tiers
CREATE TYPE public.subscription_tier AS ENUM ('free', 'brand_lite', 'starter', 'pro');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'reward', 'usage', 'monthly_grant');

-- User credits table (tracks current balance)
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 5,
  mcoins DECIMAL(10,2) NOT NULL DEFAULT 0,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  last_monthly_grant_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans table (defines available plans)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User transactions table (audit log of all credit movements)
CREATE TABLE public.user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  credits_change INTEGER NOT NULL,
  mcoins_change DECIMAL(10,2) DEFAULT 0,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- RLS Policies for user_transactions
CREATE POLICY "Users can view own transactions"
  ON public.user_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, subscription_tier)
  VALUES (NEW.id, 5, 'free');
  
  -- Log the initial grant
  INSERT INTO public.user_transactions (
    user_id,
    transaction_type,
    credits_change,
    balance_after,
    description
  ) VALUES (
    NEW.id,
    'monthly_grant',
    5,
    5,
    'Welcome bonus - Free tier monthly credits'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize credits on new user
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_credits();

-- Function to deduct credits (called when generating image)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  _user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Image generation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_credits INTEGER;
  _new_balance INTEGER;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO _current_credits
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Check if user has enough credits
  IF _current_credits < _amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  _new_balance := _current_credits - _amount;
  
  UPDATE public.user_credits
  SET credits = _new_balance,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  -- Log transaction
  INSERT INTO public.user_transactions (
    user_id,
    transaction_type,
    credits_change,
    balance_after,
    description
  ) VALUES (
    _user_id,
    'usage',
    -_amount,
    _new_balance,
    _description
  );
  
  RETURN TRUE;
END;
$$;

-- Function to add mcoins (rewards)
CREATE OR REPLACE FUNCTION public.add_mcoins(
  _user_id UUID,
  _amount DECIMAL(10,2),
  _description TEXT DEFAULT 'Template creation reward'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_mcoins DECIMAL(10,2);
  _current_credits INTEGER;
BEGIN
  -- Update mcoins
  UPDATE public.user_credits
  SET mcoins = mcoins + _amount,
      updated_at = NOW()
  WHERE user_id = _user_id
  RETURNING mcoins, credits INTO _new_mcoins, _current_credits;
  
  -- Log transaction
  INSERT INTO public.user_transactions (
    user_id,
    transaction_type,
    mcoins_change,
    credits_change,
    balance_after,
    description
  ) VALUES (
    _user_id,
    'reward',
    _amount,
    0,
    _current_credits,
    _description
  );
END;
$$;

-- Function to convert mcoins to credits (1 mcoin = 1 credit)
CREATE OR REPLACE FUNCTION public.convert_mcoins_to_credits(
  _user_id UUID,
  _mcoins_to_convert DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_mcoins DECIMAL(10,2);
  _credits_to_add INTEGER;
  _new_balance INTEGER;
BEGIN
  -- Get current mcoins
  SELECT mcoins INTO _current_mcoins
  FROM public.user_credits
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Check if user has enough mcoins
  IF _current_mcoins < _mcoins_to_convert THEN
    RETURN FALSE;
  END IF;
  
  -- Convert (1 mcoin = 1 credit)
  _credits_to_add := FLOOR(_mcoins_to_convert);
  
  -- Update credits and mcoins
  UPDATE public.user_credits
  SET credits = credits + _credits_to_add,
      mcoins = mcoins - _mcoins_to_convert,
      updated_at = NOW()
  WHERE user_id = _user_id
  RETURNING credits INTO _new_balance;
  
  -- Log transaction
  INSERT INTO public.user_transactions (
    user_id,
    transaction_type,
    mcoins_change,
    credits_change,
    balance_after,
    description
  ) VALUES (
    _user_id,
    'purchase',
    -_mcoins_to_convert,
    _credits_to_add,
    _new_balance,
    FORMAT('Converted %s mcoins to %s credits', _mcoins_to_convert, _credits_to_add)
  );
  
  RETURN TRUE;
END;
$$;

-- Insert default subscription plans
INSERT INTO public.subscription_plans (tier, name, credits, price_cents, features) VALUES
  ('free', 'Free', 5, 0, '["5 credits per month", "Basic templates", "Standard quality"]'::jsonb),
  ('brand_lite', 'Brand Lite', 50, 500, '["50 credits", "Contact info overlay", "Premium templates", "Priority support"]'::jsonb),
  ('starter', 'Starter', 150, 1500, '["150 credits", "Contact info overlay", "All templates", "Priority support", "Bulk generation"]'::jsonb),
  ('pro', 'Pro', 500, 4000, '["500 credits", "Contact info overlay", "Unlimited templates", "24/7 Priority support", "Advanced analytics", "API access"]'::jsonb);

-- Create index for faster queries
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_transactions_user_id ON public.user_transactions(user_id);
CREATE INDEX idx_user_transactions_created_at ON public.user_transactions(created_at DESC);