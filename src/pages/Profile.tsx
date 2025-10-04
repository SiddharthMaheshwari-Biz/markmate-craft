import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  CreditCard, 
  History, 
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Coins,
  ArrowRightLeft
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface UserProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserCredits {
  credits: number;
  mcoins: number;
  subscription_tier: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  credits_change: number;
  mcoins_change: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mcoinsToConvert, setMcoinsToConvert] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Fetch credits
      const { data: creditsData } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setUserCredits(creditsData);

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from("user_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setTransactions(transactionsData || []);

    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertMcoins = async () => {
    const amount = parseFloat(mcoinsToConvert);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount of mCoins to convert",
        variant: "destructive",
      });
      return;
    }

    if (!userCredits || amount > userCredits.mcoins) {
      toast({
        title: "Insufficient mCoins",
        description: "You don't have enough mCoins for this conversion",
        variant: "destructive",
      });
      return;
    }

    setConverting(true);
    try {
      const { data, error } = await supabase.rpc('convert_mcoins_to_credits', {
        _user_id: user.id,
        _mcoins_to_convert: amount
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Conversion successful!",
          description: `Converted ${amount} mCoins to ${Math.floor(amount)} credits`,
        });
        setMcoinsToConvert("");
        fetchUserData();
      } else {
        throw new Error("Conversion failed");
      }
    } catch (error) {
      console.error("Error converting mCoins:", error);
      toast({
        title: "Conversion failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    free: 'from-slate-500 to-slate-600',
    brand_lite: 'from-blue-500 to-blue-600',
    starter: 'from-purple-500 to-purple-600',
    pro: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.username || "User"}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Credits Overview Card */}
        {userCredits && (
          <Card className={`p-6 bg-gradient-to-r ${tierColors[userCredits.subscription_tier]} text-white`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Balance</h2>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full capitalize">
                  {userCredits.subscription_tier.replace('_', ' ')} Tier
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm opacity-90">Credits</span>
                  </div>
                  <p className="text-3xl font-bold">{userCredits.credits}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="w-5 h-5" />
                    <span className="text-sm opacity-90">mCoins</span>
                  </div>
                  <p className="text-3xl font-bold">{userCredits.mcoins.toFixed(1)}</p>
                </div>
              </div>
              {userCredits.subscription_tier === 'free' && (
                <Button 
                  onClick={() => navigate('/pricing')}
                  variant="secondary"
                  className="w-full"
                >
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="convert" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="convert">Convert</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Convert mCoins to Credits
              </h3>
              <p className="text-muted-foreground mb-4">
                1 mCoin = 1 Credit. You earn 0.5 mCoins for each successful template upload.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount of mCoins</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.1"
                    min="0"
                    max={userCredits?.mcoins || 0}
                    value={mcoinsToConvert}
                    onChange={(e) => setMcoinsToConvert(e.target.value)}
                    placeholder="Enter amount..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Available: {userCredits?.mcoins.toFixed(1)} mCoins
                  </p>
                </div>
                <Button 
                  onClick={handleConvertMcoins} 
                  disabled={converting || !mcoinsToConvert}
                  className="w-full"
                >
                  {converting ? "Converting..." : "Convert to Credits"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </h3>
              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No transactions yet</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {tx.credits_change !== 0 && (
                          <p className={tx.credits_change > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                            {tx.credits_change > 0 ? "+" : ""}{tx.credits_change} credits
                          </p>
                        )}
                        {tx.mcoins_change !== 0 && (
                          <p className={tx.mcoins_change > 0 ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                            {tx.mcoins_change > 0 ? "+" : ""}{tx.mcoins_change.toFixed(1)} mCoins
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark theme
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <Switch
                    id="theme-toggle"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                  <Moon className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
