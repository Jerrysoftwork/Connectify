import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current logged-in user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {user ? (
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6 text-center">
          {/* Avatar */}
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center rounded-full mx-auto mb-4 bg-gray-300 text-2xl font-bold text-gray-700">
              {user.email[0].toUpperCase()}
            </div>
          )}

          {/* Name */}
          <h1 className="text-2xl font-bold text-blue-600 mb-1">
            {user.user_metadata?.full_name || "Anonymous User"}
          </h1>

          {/* Email */}
          <p className="text-gray-600 mb-4">{user.email}</p>

          {/* Welcome text */}
          <p className="text-gray-700 mb-6">
            🎉 Welcome back to <span className="font-semibold">Connectify</span>!
          </p>

          {/* Logout button */}
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-500">⏳ Loading user...</p>
      )}
    </div>
  );
}

export default Feed;
