import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get the current logged-in user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-600">
        Welcome to Connectify 🎉
      </h1>
      {user ? (
        <p className="mt-2 text-gray-700">Logged in as: {user.email}</p>
      ) : (
        <p className="mt-2 text-gray-500">Loading user...</p>
      )}

      <button
        onClick={signOut}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}

export default Feed;
