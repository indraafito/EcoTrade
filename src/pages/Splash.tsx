import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    // Stage 1: Show loading oval (0-500ms)
    const stage1 = setTimeout(() => setAnimationStage(1), 100);
    
    // Stage 2: Show icon only (500-1000ms)
    const stage2 = setTimeout(() => setAnimationStage(2), 600);
    
    // Stage 3: Show icon smaller (1000-1500ms)
    const stage3 = setTimeout(() => setAnimationStage(3), 1100);
    
    // Stage 4: Show icon with text (1500-2000ms)
    const stage4 = setTimeout(() => setAnimationStage(4), 1600);

    // Navigate after animation
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    const navigateTimer = setTimeout(() => {
      if (hasSeenOnboarding) {
        navigate("/auth");
      } else {
        navigate("/onboarding");
      }
    }, 2500);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(stage4);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Stage 1: Loading Oval */}
      {animationStage === 0 && (
        <div className="animate-pulse">
          <div className="w-32 h-16 bg-primary rounded-full opacity-50" />
        </div>
      )}

      {/* Stage 2: Icon Only (Large) */}
      {animationStage === 1 && (
        <div className="animate-fade-in">
          <img 
            src="/icon-w.png" 
            alt="EcoTrade Icon" 
            className="w-32 h-32 object-contain animate-scale-in"
            onError={(e) => {
              // Fallback jika icon-w.png tidak ada
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = `
                <div class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-xl">
                  <div class="text-6xl font-bold text-primary">e</div>
                </div>
              `;
            }}
          />
        </div>
      )}

      {/* Stage 3: Icon Only (Medium) */}
      {animationStage === 2 && (
        <div className="animate-fade-in">
          <img 
            src="/icon-w.png" 
            alt="EcoTrade Icon" 
            className="w-24 h-24 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = `
                <div class="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl">
                  <div class="text-5xl font-bold text-primary">e</div>
                </div>
              `;
            }}
          />
        </div>
      )}

      {/* Stage 4: Icon + Text */}
      {animationStage >= 3 && (
        <div className="flex items-center gap-3 animate-fade-in">
          <img 
            src="/icon-w.png" 
            alt="EcoTrade Icon" 
            className="w-16 h-16 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = `
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mr-3">
                  <div class="text-3xl font-bold text-primary">e</div>
                </div>
              `;
            }}
          />
          <h1 className={`text-4xl font-bold text-white tracking-tight ${
            animationStage === 4 ? 'animate-slide-in' : 'opacity-0'
          }`}>
            EcoTrade
          </h1>
        </div>
      )}
    </div>
  );
};

export default Splash;
