import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import PostForm from "./PostForm";

function Feed() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  // fetch posts
  const fetchPosts = async () => {
    let { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, auth_users: user_id (email)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error.message);
    } else {
      setPosts(data);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
    fetchPosts();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {user ? (
        <>
          {/* Post Form */}
          <PostForm onPostCreated={fetchPosts} />

          {/* Posts List */}
          <div>
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white shadow-md rounded-lg p-4 mb-4"
              >
                <p className="text-gray-800">{post.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Posted by {post.auth_users?.email || "Unknown"} •{" "}
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </>
      ) : (
        <p className="text-center text-gray-500">
          ⏳ Loading user information...
        </p>
      )}
    </div>
  );
}

export default Feed;
