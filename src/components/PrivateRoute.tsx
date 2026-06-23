import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

export const ADMIN_EMAIL = 'sadishekh671@gmail.com';
export const CO_ADMIN_EMAILS = ['moderator@example.com', 'coadmin@example.com'];

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function PrivateRoute({ children, adminOnly = false }: PrivateRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        if (currentUser.email && (currentUser.email === ADMIN_EMAIL || CO_ADMIN_EMAILS.includes(currentUser.email))) {
          setIsAdmin(true);
        } else {
          // Check profile for is_admin
          const { data } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single();
          setIsAdmin(data?.is_admin === true);
        }
      }
      setLoading(false);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-theme-bg">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
