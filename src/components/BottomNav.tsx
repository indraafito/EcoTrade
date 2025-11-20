import { NavLink } from "@/components/NavLink";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative max-w-lg mx-auto px-4">
        {/* Background putih dengan border radius */}
        <div className="bg-white rounded-t-3xl shadow-lg border-t border-gray-200">
          <div className="flex justify-around items-center h-20 relative">
            {navItems.map((item) => {
              if (item.isCenter) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 -top-6"
                  >
                    {/* Tombol scan yang menonjol dengan efek lingkaran */}
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <item.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 transition-colors hover:text-primary"
                  activeClassName="text-primary"
                >
                  <item.icon className="w-6 h-6 mb-1" strokeWidth={2} />
                  <span className="text-xs font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;