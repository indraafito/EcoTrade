import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Splash = () => {
  const navigate = useNavigate();
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    const timings = [
      { stage: 1, delay: 300 },    // Icon fade in
      { stage: 2, delay: 1000 },   // Icon + text appear
      { stage: 3, delay: 2000 },   // Navigate
    ];

    const timeouts = timings.map(({ stage, delay }) =>
      setTimeout(() => setAnimationStage(stage), delay)
    );

    const navigateTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home");
      } else {
        const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
        navigate(hasSeenOnboarding ? "/onboarding":"/auth");
      }
    }, 2000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95 flex items-center justify-center p-6 overflow-hidden">
      {/* Single Logo Container - Size & Position Changes */}
      <div className={`flex items-center transition-all duration-700 ease-out ${
        animationStage === 0 
          ? "opacity-0 scale-75" 
          : animationStage === 1
          ? "opacity-100 scale-100"
          : "opacity-100 scale-100"
      }`}>
        {/* Icon - Scales down at stage 2 */}
        <img 
          src="/icon-w.png" 
          alt="EcoTrade Icon" 
          className={`object-contain drop-shadow-md flex-shrink-0 transition-all duration-700 ease-out ${
            animationStage <= 1 ? "w-32 h-32" : "w-16 h-16"
          }`}
          onError={(e) => {
            e.currentTarget.replaceWith(
              Object.assign(document.createElement('div'), {
                innerHTML: animationStage <= 1 
                  ? '<div class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-xl"><div class="text-6xl font-bold text-primary">e</div></div>'
                  : '<div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg"><div class="text-3xl font-bold text-primary">e</div></div>'
              }).firstChild
            );
          }}
        />

        {/* Text - Appears at stage 2 */}
        <h1 className={`text-4xl font-bold text-white tracking-tight whitespace-nowrap transition-all duration-700 ease-out ${
          animationStage >= 2
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-4 pointer-events-none"
        }`}>
          coTrade
        </h1>
      </div>
    </div>
  );
};

export default Splash;
