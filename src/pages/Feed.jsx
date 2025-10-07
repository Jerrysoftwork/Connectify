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
  const [activeSection, setActiveSection] = useState("home");
  const [likes, setLikes] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});

  // ✅ Fetch current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();
        
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

  // ✅ Fetch posts with profile information
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
        
        // Initialize likes state for each post
        const likesState = {};
        postsWithProfiles.forEach(post => {
          likesState[post.id] = {
            count: Math.floor(Math.random() * 50), // Mock data for now
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

  // ✅ Fetch following
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

  // ✅ Create post
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
        { 
          content: content.trim(), 
          user_id: user.id 
        },
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

  // ✅ Follow user
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

  // ✅ Unfollow user
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

  // ✅ Delete post
  const deletePost = async (postId, postUserId) => {
    if (postUserId !== user.id) return;
    
    if (!confirm("Are you sure you want to delete this post?")) return;

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

  // ✅ Logout
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

  // ✅ Handle like functionality
  const handleLike = (postId) => {
    setLikes(prev => ({
      ...prev,
      [postId]: {
        count: prev[postId]?.liked ? prev[postId].count - 1 : (prev[postId]?.count || 0) + 1,
        liked: !prev[postId]?.liked
      }
    }));
  };

  // ✅ Handle comment functionality
  const handleComment = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // ✅ Add comment
  const addComment = (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim()) return;
    
    // Here you would typically save to database
    console.log(`Adding comment "${commentText}" to post ${postId}`);
    
    // Clear comment text
    setCommentTexts(prev => ({
      ...prev,
      [postId]: ""
    }));
  };

  // ✅ Handle share functionality
  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: 'Connectify Post',
        text: post.content,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${post.content}\n\n- Shared from Connectify`);
      alert("Post content copied to clipboard!");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      createPost();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* LinkedIn-style Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">Connectify</h1>
              </div>
              <div className="hidden md:flex items-center space-x-6">
                <button 
                  onClick={() => handleNavigation('home')}
                  className={`font-medium transition-colors ${activeSection === 'home' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'} pb-4`}
                >
                  Home
                </button>
                <button 
                  onClick={() => handleNavigation('network')}
                  className={`font-medium transition-colors ${activeSection === 'network' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'} pb-4`}
                >
                  My Network
                </button>
                <button 
                  onClick={() => handleNavigation('jobs')}
                  className={`font-medium transition-colors ${activeSection === 'jobs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'} pb-4`}
                >
                  Jobs
                </button>
                <button 
                  onClick={() => handleNavigation('messaging')}
                  className={`font-medium transition-colors ${activeSection === 'messaging' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'} pb-4`}
                >
                  Messaging
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchPosts(true)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Refresh feed"
              >
                {refreshing ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              
              <div className="flex items-center space-x-3">
                <img
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-gray-200"
                />
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-red-600 font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-blue-600 to-blue-700"></div>
              <div className="px-4 pb-4 -mt-8">
                <img
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-4 border-white mx-auto"
                />
                <div className="text-center mt-2">
                  <h3 className="font-semibold text-gray-900">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </h3>
                  <p className="text-sm text-gray-600">@{user.email?.split('@')[0]}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Profile views</span>
                  <span className="text-blue-600 font-medium">12</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>Post impressions</span>
                  <span className="text-blue-600 font-medium">1,024</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Feed */}
          <div className="lg:col-span-2">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                <span className="text-sm">{error}</span>
                <button 
                  onClick={() => setError("")}
                  className="text-red-700 hover:text-red-900 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            )}

            {/* Post Creation */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="p-4">
                <div className="flex space-x-3">
                  <img
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                    alt="Profile"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Start a post..."
                      className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-3 flex justify-between items-center">
                <div className="flex space-x-4">
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Photo</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Video</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">{content.length}/500</span>
                  <button
                    onClick={createPost}
                    disabled={loading || !content.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {loading ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet!</h3>
                  <p className="text-gray-500">Start sharing your thoughts with the community</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username || 'User'}&background=0066cc&color=fff`}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h4 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                            {post.profiles?.full_name || post.profiles?.username || `User ${post.user_id.substring(0, 8)}`}
                          </h4>
                          <p className="text-sm text-gray-500">
                            @{post.profiles?.username || post.user_id.substring(0, 8)} • {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Follow/Unfollow Button */}
                        {post.user_id !== user.id && (
                          following.includes(post.user_id) ? (
                            <button
                              onClick={() => unfollowUser(post.user_id)}
                              className="text-blue-600 border border-blue-600 px-4 py-1 rounded-full hover:bg-blue-50 transition-colors text-sm font-medium"
                            >
                              Following
                            </button>
                          ) : (
                            <button
                              onClick={() => followUser(post.user_id)}
                              className="bg-blue-600 text-white px-4 py-1 rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              + Follow
                            </button>
                          )
                        )}
                        
                        {/* Delete button for own posts */}
                        {post.user_id === user.id && (
                          <button
                            onClick={() => deletePost(post.id, post.user_id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete post"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Post Content */}
                    <div className="px-4 pb-4">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    </div>
                    
                    {/* Post Actions */}
                    <div className="border-t border-gray-200 px-4 py-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex space-x-6">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center space-x-2 transition-colors ${
                              likes[post.id]?.liked 
                                ? 'text-red-600 hover:text-red-700' 
                                : 'text-gray-600 hover:text-red-600'
                            }`}
                          >
                            <svg className="w-5 h-5" fill={likes[post.id]?.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-sm">Like {likes[post.id]?.count > 0 && `(${likes[post.id].count})`}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleComment(post.id)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-sm">Comment</span>
                          </button>
                          
                          <button 
                            onClick={() => handleShare(post)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                            <span className="text-sm">Share</span>
                          </button>
                        </div>
                        
                        <span className="text-xs text-gray-400">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Comment Section */}
                      {showComments[post.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex space-x-3 mb-3">
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
                                onChange={(e) => setCommentTexts(prev => ({
                                  ...prev,
                                  [post.id]: e.target.value
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addComment(post.id);
                                  }
                                }}
                                className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => addComment(post.id)}
                              disabled={!commentTexts[post.id]?.trim()}
                              className="bg-blue-600 text-white px-3 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              Post
                            </button>
                          </div>
                          
                          {/* Sample Comments */}
                          <div className="space-y-3">
                            <div className="flex space-x-3">
                              <img
                                src="https://ui-avatars.com/api/?name=John+Doe&background=random"
                                alt="Commenter"
                                className="w-8 h-8 rounded-full"
                              />
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-lg px-3 py-2">
                                  <p className="font-medium text-sm text-gray-900">John Doe</p>
                                  <p className="text-sm text-gray-700">Great post! Thanks for sharing.</p>
                                </div>
                                <div className="flex space-x-4 mt-1">
                                  <button className="text-xs text-gray-500 hover:text-blue-600">Like</button>
                                  <button className="text-xs text-gray-500 hover:text-blue-600">Reply</button>
                                  <span className="text-xs text-gray-400">2h</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Trending Topics</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-600">#Technology</p>
                  <p className="text-xs text-gray-500">12,543 posts</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">#WebDevelopment</p>
                  <p className="text-xs text-gray-500">8,234 posts</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">#Career</p>
                  <p className="text-xs text-gray-500">6,789 posts</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">#Innovation</p>
                  <p className="text-xs text-gray-500">4,567 posts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Feed;