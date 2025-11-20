import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Recycle, TrendingUp, Gift, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Recycle,
    title: "Welcome to EcoTrade",
    description: "Smart, Sustainable, and Profitable for a Greener Future!",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "EcoTrade Sell",
    description: "Sell Easily, Earn Effortlessly, and Save the Planet!",
    color: "text-success",
  },
  {
    icon: Gift,
    title: "EcoTrade Impact",
    description: "Turn waste into value, join the green movement!",
    color: "text-accent",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

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
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full">
        {/* Icon */}
        <div
          className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-card flex items-center justify-center shadow-eco mb-8 ${slide.color}`}
        >
          <Icon className="w-12 h-12 md:w-14 md:h-14" />
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
          {slide.title}
        </h2>

        {/* Desc */}
        <p className="text-muted-foreground text-center text-base md:text-lg max-w-xl">
          {slide.description}
        </p>

        {/* Indicator */}
        <div className="flex gap-2 mt-6">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-6 md:w-8 bg-primary"
                  : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-md p-6 space-y-3">
        <Button
          onClick={handleNext}
          className="w-full h-11 md:h-12 text-base md:text-lg"
          size="lg"
        >
          {currentSlide === slides.length - 1 ? "Mulai" : "Lanjut"}
        </Button>

        {currentSlide < slides.length - 1 && (
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full h-11 md:h-12 text-base md:text-lg 
             text-primary hover:text-primary 
             hover:bg-primary/10"
          >
            Lewati
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
