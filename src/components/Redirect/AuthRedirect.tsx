import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Auth from '@/pages/Auth';

const AuthRedirect = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/home');
      } else {
        setLoading(false);
      }
    };

    checkSession();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>; // Atau komponen loading lainnya
  }

  return <Auth />;
};

export default AuthRedirect;
