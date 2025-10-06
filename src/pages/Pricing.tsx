import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Plan {
  tier: string;
  name: string;
  credits: number;
  price_cents: number;
  features: any;
}

const Pricing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string>("free");

  useEffect(() => {
    fetchPlans();
    fetchCurrentTier();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTier = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_credits')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCurrentTier(data.subscription_tier);
    }
  };

  const handlePurchase = async (plan: Plan) => {
    if (plan.tier === 'free') return;
    
    // TODO: Integrate with Stripe payment
    alert('Stripe integration coming soon! This will allow you to purchase credits.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tierGradients: Record<string, string> = {
    free: 'from-slate-500 to-slate-600',
    brand_lite: 'from-blue-500 to-blue-600',
    starter: 'from-purple-500 to-purple-600',
    pro: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Unlock powerful AI-driven marketing campaigns
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier;
            const isFree = plan.tier === 'free';

            return (
              <Card 
                key={plan.tier}
                className={`p-6 relative ${isCurrentPlan ? 'ring-2 ring-primary shadow-xl' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </div>
                )}

                <div className={`w-full h-2 rounded-full bg-gradient-to-r ${tierGradients[plan.tier]} mb-6`} />

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ₹{(plan.price_cents / 100).toFixed(0)}
                    </span>
                    {!isFree && <span className="text-muted-foreground">/pack</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.credits} {plan.credits === 1 ? 'credit' : 'credits'}
                    {isFree && ' per month'}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {(plan.features as string[]).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handlePurchase(plan)}
                  disabled={isCurrentPlan || isFree}
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : "default"}
                >
                  {isCurrentPlan ? "Current Plan" : isFree ? "Free Forever" : "Purchase Now"}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="p-8 mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-4">
            <Sparkles className="w-12 h-12 text-primary" />
            <div>
              <h3 className="text-xl font-bold mb-2">How mCoins Work</h3>
              <p className="text-muted-foreground">
                Earn <span className="font-semibold text-foreground">0.5 mCoins</span> for every successful template upload! 
                Convert your mCoins to credits anytime (1 mCoin = 1 Credit) in your profile.
              </p>
            </div>
          </div>
        </Card>

        {/* Paid Features Note */}
        <Card className="p-6 mt-6 border-dashed">
          <p className="text-center text-muted-foreground">
            <span className="font-semibold text-foreground">Premium Feature:</span> Only paid tier users (Brand Lite, Starter, Pro) 
            can add contact information overlays to generated images.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Pricing;
