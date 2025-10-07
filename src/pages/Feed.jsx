import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Feed() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [likes, setLikes] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications] = useState(3);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error fetching user:", error);
          setError("Failed to load user information");
          return;
        }
        
        setUser(user);
        if (user) {
          await fetchFollowing(user.id);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    };
    
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchFollowing(session.user.id);
        } else {
          setFollowing([]);
          setPosts([]);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchPosts = async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    
    try {
      const { data: postsWithProfiles, error: profileError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (!profileError && postsWithProfiles) {
        setPosts(postsWithProfiles);
        
        const likesState = {};
        postsWithProfiles.forEach(post => {
          likesState[post.id] = {
            count: Math.floor(Math.random() * 50),
            liked: false
          };
        });
        setLikes(likesState);
        setError("");
        return;
      }

      const { data: simplePosts, error: simpleError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (simpleError) {
        console.error("Error fetching posts:", simpleError);
        setError("Failed to load posts");
        return;
      }

      setPosts(simplePosts || []);
      setError("");

    } catch (err) {
      console.error("Unexpected error fetching posts:", err);
      setError("An unexpected error occurred while loading posts");
    } finally {
      if (showLoader) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchFollowing = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (!error && data) {
        setFollowing(data.map((f) => f.following_id));
      }
    } catch (err) {
      console.error("Error fetching following:", err);
    }
  };

  const createPost = async () => {
    if (!content.trim()) {
      setError("Post content cannot be empty");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    if (!user) {
      setError("You must be logged in to post");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.from("posts").insert([
        { content: content.trim(), user_id: user.id },
      ]);

      if (error) {
        console.error("Error creating post:", error);
        setError("Failed to create post");
        return;
      }

      setContent("");
      await fetchPosts();
    } catch (err) {
      console.error("Unexpected error creating post:", err);
      setError("An unexpected error occurred while creating post");
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (targetId) => {
    if (!user || following.includes(targetId)) return;

    try {
      const { error } = await supabase.from("follows").insert([
        { follower_id: user.id, following_id: targetId },
      ]);
      
      if (!error) {
        setFollowing([...following, targetId]);
      }
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const unfollowUser = async (targetId) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);

      if (!error) {
        setFollowing(following.filter((id) => id !== targetId));
      }
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

  const deletePost = async (postId, postUserId) => {
    if (postUserId !== user.id) return;
    
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (!error) {
        setPosts(posts.filter(post => post.id !== postId));
      } else {
        setError("Failed to delete post");
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("An unexpected error occurred");
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setPosts([]);
      setFollowing([]);
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to log out");
    }
  };

  const handleLike = (postId) => {
    setLikes(prev => ({
      ...prev,
      [postId]: {
        count: prev[postId]?.liked ? prev[postId].count - 1 : (prev[postId]?.count || 0) + 1,
        liked: !prev[postId]?.liked
      }
    }));
  };

  const handleComment = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const addComment = (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim()) return;
    
    console.log(`Adding comment "${commentText}" to post ${postId}`);
    
    setCommentTexts(prev => ({
      ...prev,
      [postId]: ""
    }));
  };

  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: 'Connectify Post',
        text: post.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${post.content}\n\n- Shared from Connectify`);
      alert("Post content copied to clipboard!");
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return past.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              
              <div className="relative hidden md:block">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-1.5 bg-blue-50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center px-6 py-2 border-b-2 transition-colors ${
                  activeTab === "home" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs mt-0.5 font-medium">Home</span>
              </button>
              
              <button
                onClick={() => setActiveTab("network")}
                className={`flex flex-col items-center px-6 py-2 border-b-2 transition-colors ${
                  activeTab === "network" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs mt-0.5 font-medium">Network</span>
              </button>
              
              <button
                onClick={() => setActiveTab("jobs")}
                className={`flex flex-col items-center px-6 py-2 border-b-2 transition-colors ${
                  activeTab === "jobs" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs mt-0.5 font-medium">Jobs</span>
              </button>
              
              <button
                onClick={() => setActiveTab("messaging")}
                className={`flex flex-col items-center px-6 py-2 border-b-2 transition-colors ${
                  activeTab === "messaging" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs mt-0.5 font-medium">Messaging</span>
              </button>
              
              <button
                onClick={() => setActiveTab("notifications")}
                className="flex flex-col items-center px-6 py-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900 transition-colors relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications > 0 && (
                  <span className="absolute top-1 right-4 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
                <span className="text-xs mt-0.5 font-medium">Notifications</span>
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              <button onClick={logout} className="flex flex-col items-center text-gray-600 hover:text-gray-900">
                <img
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                  alt="Profile"
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs mt-0.5 font-medium">Me</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
              <div className="h-14 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <div className="px-4 pb-4 -mt-7 text-center">
                <img
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-4 border-white mx-auto mb-2"
                />
                <h3 className="font-semibold text-gray-900 text-sm">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h3>
                <p className="text-xs text-gray-600 mt-1">Software Developer | Tech Enthusiast</p>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-600">Profile viewers</span>
                  <span className="text-blue-600 font-semibold">89</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Post impressions</span>
                  <span className="text-blue-600 font-semibold">1,247</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-3">
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>My items</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h4 className="text-xs font-semibold text-gray-900 mb-2">Recent</h4>
              <div className="space-y-2">
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>Web Development</span>
                </button>
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>React Programming</span>
                </button>
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>Tech Innovation</span>
                </button>
              </div>
            </div>
          </aside>

          <div className="col-span-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                <span className="text-sm">{error}</span>
                <button onClick={() => setError("")} className="text-red-700 hover:text-red-900 font-bold text-lg">×</button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-start space-x-3">
                <img
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                  alt="Profile"
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start a post..."
                    className="w-full border border-gray-300 rounded-full px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={1}
                    onFocus={(e) => e.target.rows = 3}
                    onBlur={(e) => !content && (e.target.rows = 1)}
                  />
                </div>
              </div>
              
              {content && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={createPost}
                    disabled={loading || !content.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-300 text-sm font-semibold transition-colors"
                  >
                    {loading ? "Posting..." : "Post"}
                  </button>
                </div>
              )}
              
              {!content && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/>
                    </svg>
                    <span className="text-sm font-medium">Photo</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    <span className="text-sm font-medium">Video</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                    </svg>
                    <span className="text-sm font-medium">Event</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span className="text-sm font-medium">Article</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <hr className="flex-1 border-gray-300" />
              <span className="px-4 text-xs text-gray-500">Sort by: <span className="font-semibold">Top</span></span>
              <hr className="flex-1 border-gray-300" />
            </div>

            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet!</h3>
                  <p className="text-gray-500">Start sharing your thoughts with the community</p>
                </div>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <img
                          src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username || 'User'}&background=0066cc&color=fff`}
                          alt={post.profiles?.full_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900 hover:text-blue-600 cursor-pointer">
                            {post.profiles?.full_name || post.profiles?.username || `User ${post.user_id.substring(0, 8)}`}
                          </h3>
                          <p className="text-xs text-gray-600">Software Engineer at Tech Corp</p>
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            {formatTimeAgo(post.created_at)} · 🌐
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {post.user_id !== user.id && (
                          following.includes(post.user_id) ? (
                            <button
                              onClick={() => unfollowUser(post.user_id)}
                              className="text-blue-600 border border-blue-600 px-4 py-1 rounded-full hover:bg-blue-50 text-sm font-semibold transition-colors"
                            >
                              Following
                            </button>
                          ) : (
                           <button
                              onClick={() => followUser(post.user_id)}
                              className="text-blue-600 flex items-center space-x-1 hover:bg-blue-50 px-3 py-1 rounded text-sm font-semibold transition-colors"
                            >
                              <span className="text-lg">+</span>
                              <span>Follow</span>
                            </button>
                          )
                        )}
                        
                        {post.user_id === user.id && (
                          <button
                            onClick={() => deletePost(post.id, post.user_id)}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-4 pb-4">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{post.content}</p>
                    </div>
                    
                    <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
                      <span>{likes[post.id]?.count || 0} likes</span>
                      <span>24 comments · 12 shares</span>
                    </div>
                    
                    <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-around">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-100 transition-colors ${
                          likes[post.id]?.liked ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        <svg className="w-5 h-5" fill={likes[post.id]?.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span className="text-sm font-medium">Like</span>
                      </button>
                      
                      <button
                        onClick={() => handleComment(post.id)}
                        className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm font-medium">Comment</span>
                      </button>
                      
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span className="text-sm font-medium">Share</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span className="text-sm font-medium">Send</span>
                      </button>
                    </div>
                    
                    {showComments[post.id] && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <img
                            src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                            alt="Your avatar"
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentTexts[post.id] || ""}
                              onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                              onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                              className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => addComment(post.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 text-sm font-semibold transition-colors"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-900">Add to your feed</h3>
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    #
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Web Development</h4>
                    <p className="text-xs text-gray-600 mb-2">Community • 145k followers</p>
                    <button className="flex items-center space-x-1 text-gray-600 border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-50 transition-colors">
                      <span className="text-lg font-semibold">+</span>
                      <span className="text-xs font-semibold">Follow</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    #
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">React Developers</h4>
                    <p className="text-xs text-gray-600 mb-2">Community • 89k followers</p>
                    <button className="flex items-center space-x-1 text-gray-600 border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-50 transition-colors">
                      <span className="text-lg font-semibold">+</span>
                      <span className="text-xs font-semibold">Follow</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    #
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">Tech Innovation</h4>
                    <p className="text-xs text-gray-600 mb-2">Community • 234k followers</p>
                    <button className="flex items-center space-x-1 text-gray-600 border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-50 transition-colors">
                      <span className="text-lg font-semibold">+</span>
                      <span className="text-xs font-semibold">Follow</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <button className="text-sm text-gray-600 hover:text-blue-600 font-semibold mt-3">
                View all recommendations →
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Connectify News</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer mb-1">
                    AI Revolution in Software Development
                  </h4>
                  <p className="text-xs text-gray-600">2 hours ago • 12,456 readers</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer mb-1">
                    Remote Work Trends for 2025
                  </h4>
                  <p className="text-xs text-gray-600">5 hours ago • 8,234 readers</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer mb-1">
                    Top Programming Languages This Year
                  </h4>
                  <p className="text-xs text-gray-600">1 day ago • 15,678 readers</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 hover:text-blue-600 cursor-pointer mb-1">
                    Cybersecurity Best Practices
                  </h4>
                  <p className="text-xs text-gray-600">2 days ago • 9,123 readers</p>
                </div>
              </div>
              
              <button className="text-sm text-gray-600 hover:text-blue-600 font-semibold mt-3">
                Show more →
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Feed;