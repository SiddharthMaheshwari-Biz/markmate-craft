import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Coins, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UserCredits {
  credits: number;
  mcoins: number;
  subscription_tier: string;
}

export const CreditsDisplay = () => {
  const navigate = useNavigate();
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCredits();

    // Set up real-time subscription for credits updates
    const channel = supabase
      .channel('credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
        },
        () => {
          fetchUserCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_credits')
        .select('credits, mcoins, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !userCredits) return null;

  const tierColors: Record<string, string> = {
    free: 'from-slate-500 to-slate-600',
    brand_lite: 'from-blue-500 to-blue-600',
    starter: 'from-purple-500 to-purple-600',
    pro: 'from-amber-500 to-amber-600',
  };

  const tierColor = tierColors[userCredits.subscription_tier] || tierColors.free;

  return (
    <Card className={`p-4 bg-gradient-to-r ${tierColor} text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="text-sm opacity-90">Credits</p>
              <p className="text-2xl font-bold">{userCredits.credits}</p>
            </div>
          </div>

          <div className="h-10 w-px bg-white/30" />

          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            <div>
              <p className="text-sm opacity-90">mCoins</p>
              <p className="text-2xl font-bold">{userCredits.mcoins.toFixed(1)}</p>
            </div>
          </div>

          <div className="h-10 w-px bg-white/30" />

          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="text-sm opacity-90">Tier</p>
              <p className="text-lg font-semibold capitalize">
                {userCredits.subscription_tier.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {userCredits.subscription_tier === 'free' && (
          <Button 
            onClick={() => navigate('/pricing')}
            variant="secondary"
            size="sm"
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            Upgrade
          </Button>
        )}
      </div>
    </Card>
  );
};
