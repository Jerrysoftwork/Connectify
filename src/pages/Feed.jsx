import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Feed() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current session
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/"); // 👈 redirect to login if no user
      } else {
        setUser(user);
      }
    };

    getUser();

    // Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!session?.user) {
          navigate("/"); // 👈 kick back to login if logged out
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // 👈 send to login after logout
  };

  return (
    <div className="p-6">
      {user ? (
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
      ) : (
        <p className="text-center text-gray-500">
          ⏳ Loading user information...
        </p>
      )}
    </div>
  );
}

export default Feed;
