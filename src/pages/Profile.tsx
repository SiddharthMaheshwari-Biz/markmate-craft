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
  ArrowRightLeft,
  Award,
  TrendingUp,
  Calendar,
  Loader2
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-8 w-full max-w-4xl mx-auto p-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    free: 'from-slate-500 to-slate-600',
    brand_lite: 'from-blue-500 to-blue-600',
    starter: 'from-purple-500 to-purple-600',
    pro: 'from-amber-500 to-amber-600',
  };

  const creditsProgress = userCredits ? (userCredits.credits / 100) * 100 : 0;
  const mcoinsProgress = userCredits ? (userCredits.mcoins / 50) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section - Claude-inspired */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm bg-card">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-lg">
                      {profile?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-background border-2 border-primary rounded-full p-1.5">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profile?.username || "User"}</h1>
                    <p className="text-muted-foreground">{user?.email}</p>
                    {userCredits && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          <TrendingUp className="w-4 h-4" />
                          <span className="capitalize">{userCredits.subscription_tier.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Member since {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={handleSignOut} className="self-start md:self-center">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>

          {/* Stats Cards - Claude-inspired grid */}
          {userCredits && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Credits Card */}
              <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Available</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold">{userCredits.credits}</p>
                    <p className="text-sm text-muted-foreground">Credits</p>
                    <Progress value={creditsProgress} className="h-1.5" />
                  </div>
                </div>
              </Card>

              {/* mCoins Card */}
              <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-accent/10">
                      <Coins className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Earned</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold">{userCredits.mcoins.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">mCoins</p>
                    <Progress value={mcoinsProgress} className="h-1.5" />
                  </div>
                </div>
              </Card>

              {/* Quick Actions Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-accent text-white hover:shadow-md transition-shadow">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-white/20">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm opacity-90">Your Tier</p>
                    <p className="text-2xl font-bold capitalize">{userCredits.subscription_tier.replace('_', ' ')}</p>
                    {userCredits.subscription_tier === 'free' && (
                      <Button 
                        onClick={() => navigate('/pricing')}
                        variant="secondary"
                        size="sm"
                        className="w-full bg-white text-primary hover:bg-white/90"
                      >
                        Upgrade Plan
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="convert" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="convert" className="text-sm md:text-base">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm md:text-base">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm md:text-base">
              <User className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4 mt-6">
            <Card className="border-0 shadow-sm">
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Convert mCoins to Credits</h3>
                  <p className="text-sm text-muted-foreground">
                    Transform your earned mCoins into credits. 1 mCoin = 1 Credit
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <Coins className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">How to earn mCoins</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Upload templates to earn 0.5 mCoins each</li>
                        <li>• Share your creations with the community</li>
                        <li>• Convert anytime at 1:1 ratio</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-base">Amount to convert</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.1"
                      min="0"
                      max={userCredits?.mcoins || 0}
                      value={mcoinsToConvert}
                      onChange={(e) => setMcoinsToConvert(e.target.value)}
                      placeholder="0.0"
                      className="text-lg h-12"
                    />
                    <p className="text-sm text-muted-foreground flex items-center justify-between">
                      <span>Available: {userCredits?.mcoins.toFixed(1)} mCoins</span>
                      {mcoinsToConvert && (
                        <span className="text-primary font-medium">
                          = {Math.floor(parseFloat(mcoinsToConvert))} Credits
                        </span>
                      )}
                    </p>
                  </div>
                  <Button 
                    onClick={handleConvertMcoins} 
                    disabled={converting || !mcoinsToConvert}
                    className="w-full h-12 text-base"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="w-5 h-5 mr-2" />
                        Convert to Credits
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <Card className="border-0 shadow-sm">
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Transaction History</h3>
                  <p className="text-sm text-muted-foreground">
                    Track all your credit and mCoin transactions
                  </p>
                </div>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                        <History className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          {tx.credits_change !== 0 && (
                            <p className={`font-semibold ${tx.credits_change > 0 ? "text-green-600" : "text-red-600"}`}>
                              {tx.credits_change > 0 ? "+" : ""}{tx.credits_change} credits
                            </p>
                          )}
                          {tx.mcoins_change !== 0 && (
                            <p className={`text-sm ${tx.mcoins_change > 0 ? "text-green-600" : "text-red-600"}`}>
                              {tx.mcoins_change > 0 ? "+" : ""}{tx.mcoins_change.toFixed(1)} mCoins
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card className="border-0 shadow-sm">
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your viewing experience
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="space-y-1">
                    <Label htmlFor="theme-toggle" className="text-base font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sun className="w-5 h-5 text-muted-foreground" />
                    <Switch
                      id="theme-toggle"
                      checked={theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  </div>
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
