import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { getUserData, initializeUserData } from "../utils/storage";
import { Menu, X, LayoutDashboard, Target, TrendingUp, Award, BookOpen, Images, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { MotivationalReminder } from "./MotivationalReminder";
import { Toaster } from "./ui/sonner";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const userData = initializeUserData();
    
    // Redirect to onboarding if not completed and not already there
    if (!userData.onboardingCompleted && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [navigate, location.pathname]);
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/vision-board', label: 'Vision Board', icon: Sparkles },
    { path: '/gallery', label: 'Gallery', icon: Images },
    { path: '/life-balance', label: 'Life Balance', icon: TrendingUp },
    { path: '/achievements', label: 'Achievements', icon: Award },
    { path: '/journal', label: 'Journal', icon: BookOpen },
  ];
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  // Don't show navigation on onboarding
  if (location.pathname === '/onboarding' || 
      location.pathname === '/life-insight' || 
      location.pathname === '/feasibility' || 
      location.pathname === '/smart-goal-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Outlet />
        <Toaster />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Vision Board
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={isActive(item.path) ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <MotivationalReminder />
      <Toaster />
    </div>
  );
}