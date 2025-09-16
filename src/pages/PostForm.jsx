import { useState } from "react";
import { supabase } from "../supabaseClient";

function PostForm({ onPostCreated }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to post");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("posts").insert([
      {
        user_id: user.id,
        content,
      },
    ]);

    if (error) {
      console.error("Post error:", error.message);
    } else {
      setContent("");
      onPostCreated?.(); // refresh feed
    }

    setLoading(false);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6">
      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        onClick={handlePost}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </div>
  );
}

export default PostForm;
