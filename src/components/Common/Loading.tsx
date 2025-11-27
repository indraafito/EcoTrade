// src/components/Loading.tsx
import { Leaf } from "lucide-react";

interface LoadingProps {
  size?: number; // ukuran spinner
}

const Loading = ({ size = 16 }: LoadingProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 flex items-center justify-center">
      <div className="relative">
        <div
          className={`animate-spin rounded-full h-${size} w-${size} border-4 border-primary/20 border-t-primary`}
        />
        <Leaf className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
      </div>
    </div>
  );
};

export default Loading;
