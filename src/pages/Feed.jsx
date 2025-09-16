import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get the logged-in user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        ⏳ Loading user information...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          Welcome to Connectify 🎉
        </h1>

        {/* Avatar */}
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="Profile"
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
        )}

        {/* Name & Email */}
        <p className="text-lg font-semibold text-gray-800">
          {user.user_metadata?.full_name || "Anonymous User"}
        </p>
        <p className="text-gray-600">{user.email}</p>

        {/* Logout button */}
        <button
          onClick={logout}
          className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Feed;
