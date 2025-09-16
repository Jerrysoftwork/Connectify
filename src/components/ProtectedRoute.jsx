import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <p className="text-center mt-10">⏳ Checking authentication...</p>;
  }

  if (!user) {
    return <Navigate to="/" replace />; // 👈 redirect to login if not logged in
  }

  return children;
}

export default ProtectedRoute;
