import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

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
    <div className="p-6">
      {user ? (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">
            Welcome to Connectify 🎉
          </h1>

          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-4"
            />
          )}

          <p className="text-lg font-semibold text-gray-800">
            {user.user_metadata?.full_name || "Anonymous User"}
          </p>
          <p className="text-gray-600">{user.email}</p>

          <button
            onClick={logout}
            className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-500">⏳ Loading user info...</p>
      )}
    </div>
  );
}

export default Feed;
