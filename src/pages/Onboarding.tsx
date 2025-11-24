import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const slides = [
  {
    icon: "cuate.svg",
    title: "Welcome to EcoTrade",
    description: "Smart, Sustainable, and Profitable for a Greener Future!",
    gradient: "from-primary to-[#1DBF73]",
  },
  {
    icon: "amico.svg",
    title: "EcoTrade Sell",
    description: "Sell Easily, Earn Effortlessly, and Save the Planet!",
    gradient: "from-[#1DBF73] to-primary",
  },
  {
    icon: "rafiki.svg",
    title: "EcoTrade Impact",
    description: "Turn waste into value, join the green movement!",
    gradient: "from-primary to-[#1DBF73]",
  },
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem("hasSeenOnboarding", "true");
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    navigate("/auth");
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#112C22] flex flex-col items-center justify-center px-6 py-10 relative">
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-card backdrop-blur-2xl p-8 md:p-12 relative">
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/icon.png" alt="EcoTrade" className="w-10 h-10" />
              <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-[#1DBF73] bg-clip-text text-transparent">
                coTrade
              </h1>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <img
                src={slide.icon}
                alt={slide.title}
                className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>

          <h2 className={`text-2xl md:text-3xl font-bold text-center mb-4 bg-gradient-to-br ${slide.gradient} bg-clip-text text-transparent`}>
            {slide.title}
          </h2>

          <p className="text-muted-foreground text-center text-base md:text-lg max-w-xl mx-auto mb-8">
            {slide.description}
          </p>

          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? `w-8 bg-gradient-to-r ${slide.gradient}`
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleNext}
              className="w-full py-3.5 bg-gradient-to-br from-primary to-[#1DBF73] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              {currentSlide === slides.length - 1 ? "Mulai" : "Lanjut"}
              {currentSlide === slides.length - 1 ? (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              ) : (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </button>

            {currentSlide < slides.length - 1 && (
              <button
                onClick={handleSkip}
                className="w-full py-3.5 bg-muted backdrop-blur-sm text-foreground border border-border/50 rounded-xl font-medium hover:bg-muted/70 transition-all"
              >
                Lewati
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;