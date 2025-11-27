import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminProtectedRoute = ({ children, fallback }: AdminProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log('🔐 Checking admin access...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('❌ No authenticated user found');
        setError("Anda harus login terlebih dahulu");
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      console.log('✅ User found:', user.id);

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleError) {
        console.log('❌ Role check failed:', roleError);
        if (roleError.code === 'PGRST116') {
          // No rows returned - user doesn't have admin role
          setError("Akses ditolak. Anda tidak memiliki izin admin.");
          toast.error("Akses ditolak. Hanya admin yang dapat mengakses halaman ini.");
        } else {
          setError("Terjadi kesalahan saat memeriksa izin akses.");
        }
        setTimeout(() => navigate("/home"), 2000);
        return;
      }

      if (!roleData) {
        console.log('❌ No admin role found for user');
        setError("Akses ditolak. Anda tidak memiliki izin admin.");
        toast.error("Akses ditolak. Hanya admin yang dapat mengakses halaman ini.");
        setTimeout(() => navigate("/home"), 2000);
        return;
      }

      console.log('✅ Admin access confirmed');
      setIsAuthorized(true);
      
    } catch (error) {
      console.error('❌ Admin access check error:', error);
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
      setTimeout(() => navigate("/auth"), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memeriksa izin akses...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized || error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
            <p className="text-gray-600">Halaman ini hanya dapat diakses oleh administrator</p>
          </div>
          
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => navigate("/home")}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Kembali ke Beranda
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Login Ulang
            </button>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-6">
            Anda akan dialihkan otomatis dalam 2 detik...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
