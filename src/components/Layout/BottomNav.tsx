import { NavLink } from "@/components";
import { Home, MapPin, QrCode, User, Gift } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    { to: "/home", icon: Home, label: "Home" },
    { to: "/location", icon: MapPin, label: "Location" },
    { to: "/scan", icon: QrCode, label: "Scan", isCenter: true },
    { to: "/vouchers", icon: Gift, label: "Reward" },
    { to: "/profile", icon: User, label: "Account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="relative max-w-lg mx-auto">
        {/* Background dengan glassmorphism */}
        <div className="bg-card/95 backdrop-blur-2xl rounded-t-[32px] shadow-2xl border-t-2 border-white/20 dark:border-white/10 relative overflow-visible">
          {/* Decorative gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="flex items-center h-[72px] relative">
            {/* Left side items */}
            <div className="flex flex-1 justify-around">
            {/* Left side items */}
            <div className="flex flex-1 justify-around pr-8">
              {navItems.slice(0, 2).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center py-2 gap-1 text-muted-foreground/70 transition-all duration-200"
                  activeClassName="text-primary scale-105"
                >
                  {({ isActive }) => (
                    <>
                      <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
                        )}
                        <item.icon className="w-6 h-6 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Center scan button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-10 px-4">
              <NavLink
                to="/scan"
                className="flex items-center justify-center"
              >
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-primary/40 to-[#1DBF73]/40 rounded-[20px] blur-lg" />
                  
                  {/* Main button with gradient border */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#1DBF73] to-primary rounded-[20px] p-[2px]">
                      <div className="w-full h-full bg-gradient-to-br from-primary to-[#1DBF73] rounded-[18px]" />
                    </div>
                    
                    <div className="relative w-[68px] h-[68px] bg-gradient-to-br from-primary to-[#1DBF73] rounded-[20px] flex items-center justify-center shadow-2xl">
                      {/* Inner highlight */}
                      <div className="absolute inset-[6px] bg-white/10 rounded-2xl" />
                      <QrCode className="w-9 h-9 text-white relative z-10" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </NavLink>
            </div>

            {/* Right side items */}
            <div className="flex flex-1 justify-around pl-8">
              {navItems.slice(3).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center py-2 gap-1 text-muted-foreground/70 transition-all duration-200"
                  activeClassName="text-primary scale-105"
                >
                  {({ isActive }) => (
                    <>
                      <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
                        )}
                        <item.icon className="w-6 h-6 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;