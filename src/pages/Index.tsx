import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Create from "./Create";
import { BrandOnboarding } from "@/components/BrandOnboarding";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding query param is present
    if (searchParams.get('onboarding') === 'true') {
      const hasCompletedOnboarding = localStorage.getItem('markmate_brand_onboarding_complete');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      } else {
        // Remove query param if already completed
        navigate("/", { replace: true });
      }
    }
  }, [searchParams, navigate]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('markmate_brand_onboarding_complete', 'true');
    setShowOnboarding(false);
    navigate("/", { replace: true });
  };

  if (showOnboarding) {
    return <BrandOnboarding onComplete={handleOnboardingComplete} />;
  }

  return <Create />;
};

export default Index;
