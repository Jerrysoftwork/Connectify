import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState([]); // track who current user follows

  // ✅ Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        fetchFollowing(user.id);
      }
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchFollowing(session.user.id);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ✅ Fetch posts from Supabase
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, user_id")
      .order("created_at", { ascending: false });
    if (!error) {
      setPosts(data);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ✅ Fetch who current user is following
  const fetchFollowing = async (userId) => {
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (!error) {
      setFollowing(data.map((f) => f.following_id));
    }
  };

  // ✅ Create a new post
  const createPost = async () => {
    if (!content.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("posts").insert([
      {
        content,
        user_id: user.id,
      },
    ]);
    setLoading(false);

    if (!error) {
      setContent("");
      fetchPosts(); // refresh feed
    }
  };

  // ✅ Follow user
  const followUser = async (targetId) => {
    if (!user) return;
    const { error } = await supabase.from("follows").insert([
      {
        follower_id: user.id,
        following_id: targetId,
      },
    ]);
    if (!error) {
      setFollowing([...following, targetId]);
    }
  };

  // ✅ Unfollow user
  const unfollowUser = async (targetId) => {
    if (!user) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);

    if (!error) {
      setFollowing(following.filter((id) => id !== targetId));
    }
  };

  // ✅ Logout
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      {user ? (
        <>
          {/* Post form */}
          <div className="bg-white shadow-md rounded-lg p-4 mb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full border rounded p-2 mb-2"
            />
            <button
              onClick={createPost}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>

          {/* Feed */}
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white shadow-md rounded-lg p-4 mb-4"
            >
              <p className="text-gray-800">{post.content}</p>
              <p className="text-sm text-gray-500">
                Posted on {new Date(post.created_at).toLocaleString()}
              </p>

              {/* Follow/Unfollow Button */}
              {post.user_id !== user.id && (
                following.includes(post.user_id) ? (
                  <button
                    onClick={() => unfollowUser(post.user_id)}
                    className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Unfollow
                  </button>
                ) : (
                  <button
                    onClick={() => followUser(post.user_id)}
                    className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Follow
                  </button>
                )
              )}
            </div>
          ))}

          {/* Logout button */}
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
