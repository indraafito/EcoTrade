import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    icon: "cuate.png",
    title: "Welcome to EcoTrade",
    description: "Smart, Sustainable, and Profitable for a Greener Future!",
    color: "text-primary",
  },
  {
    icon: "amico.png",
    title: "EcoTrade Sell",
    description: "Sell Easily, Earn Effortlessly, and Save the Planet!",
    color: "text-success",
  },
  {
    icon: "rafiki.png",
    title: "EcoTrade Impact",
    description: "Turn waste into value, join the green movement!",
    color: "text-accent",
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full">
        {/* Icon */}
        <img
          src={slide.icon}
          alt={slide.title}
          className="w-32 h-32 md:w-40 md:h-40 object-contain mb-8"
          onError={(e) => {
            // cast the event target to HTMLImageElement before accessing style
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

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
      <div className="w-full max-w-md p-6 space-y-3 flex flex-col items-center">
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