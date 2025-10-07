import { useEffect, useState, useRef } from "react";
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
  
  // New states for media
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Event form data
  const [eventData, setEventData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: ""
  });
  
  // Article form data
  const [articleData, setArticleData] = useState({
    title: "",
    subtitle: "",
    content: "",
    coverImage: null
  });
  
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const articleImageRef = useRef(null);

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

  // ✅ Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Image size should be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Handle video selection
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError("Video size should be less than 50MB");
        return;
      }
      setSelectedVideo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Upload file to Supabase Storage
  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('posts-media') // Make sure this bucket exists in Supabase
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('posts-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // ✅ Create post with media
  const createPost = async () => {
    if (!content.trim() && !selectedImage && !selectedVideo) {
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
      let imageUrl = null;
      let videoUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadProgress(30);
        imageUrl = await uploadFile(selectedImage, 'images');
      }

      // Upload video if selected
      if (selectedVideo) {
        setUploadProgress(60);
        videoUrl = await uploadFile(selectedVideo, 'videos');
      }

      setUploadProgress(90);

      // Create post with media URLs
      const { error } = await supabase.from("posts").insert([
        { 
          content: content.trim(), 
          user_id: user.id,
          image_url: imageUrl,
          video_url: videoUrl,
          post_type: videoUrl ? 'video' : imageUrl ? 'image' : 'text'
        },
      ]);

      if (error) {
        console.error("Error creating post:", error);
        setError("Failed to create post");
        return;
      }

      // Reset form
      setContent("");
      setSelectedImage(null);
      setSelectedVideo(null);
      setImagePreview(null);
      setVideoPreview(null);
      setUploadProgress(0);
      await fetchPosts();
    } catch (err) {
      console.error("Unexpected error creating post:", err);
      setError("An unexpected error occurred while creating post");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create event post
  const createEventPost = async () => {
    if (!eventData.title || !eventData.date) {
      setError("Event title and date are required");
      return;
    }

    setLoading(true);
    try {
      const eventContent = `🎉 EVENT: ${eventData.title}\n📅 ${eventData.date} at ${eventData.time}\n📍 ${eventData.location}\n\n${eventData.description}`;
      
      const { error } = await supabase.from("posts").insert([
        { 
          content: eventContent, 
          user_id: user.id,
          post_type: 'event',
          event_data: eventData
        },
      ]);

      if (error) throw error;

      setShowEventModal(false);
      setEventData({ title: "", date: "", time: "", location: "", description: "" });
      await fetchPosts();
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create article post
  const createArticlePost = async () => {
    if (!articleData.title || !articleData.content) {
      setError("Article title and content are required");
      return;
    }

    setLoading(true);
    try {
      let coverImageUrl = null;
      
      if (articleData.coverImage) {
        coverImageUrl = await uploadFile(articleData.coverImage, 'articles');
      }

      const { error } = await supabase.from("posts").insert([
        { 
          content: articleData.content,
          user_id: user.id,
          post_type: 'article',
          article_title: articleData.title,
          article_subtitle: articleData.subtitle,
          image_url: coverImageUrl
        },
      ]);

      if (error) throw error;

      setShowArticleModal(false);
      setArticleData({ title: "", subtitle: "", content: "", coverImage: null });
      await fetchPosts();
    } catch (err) {
      console.error("Error creating article:", err);
      setError("Failed to create article");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Remove selected media
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
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
      {/* Header - Same as before */}
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
                  activeTab === "home"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
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
                  activeTab === "network"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
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
                  activeTab === "jobs"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
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
                  activeTab === "messaging"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
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
              <button 
                onClick={logout}
                className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              >
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Same as before */}
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
                <p className="text-xs text-gray-600 mt-1">
                  Software Developer | Tech Enthusiast
                </p>
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
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full text-left">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>Web Development</span>
                </button>
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full text-left">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>React Programming</span>
                </button>
                <button className="flex items-center space-x-2 text-xs text-gray-700 hover:text-gray-900 w-full text-left">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>Tech Innovation</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Center Feed */}
          <div className="col-span-6">
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

            {/* Create Post with Media Support */}
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mt-3 relative">
                      <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg" />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Video Preview */}
                  {videoPreview && (
                    <div className="mt-3 relative">
                      <video src={videoPreview} controls className="max-h-64 rounded-lg w-full" />
                      <button
                        onClick={removeVideo}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      {/* Image Upload */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        disabled={loading || selectedVideo}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Photo</span>
                      </button>
                      
                      {/* Video Upload */}
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        disabled={loading || selectedImage}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Video</span>
                      </button>
                      
                      {/* Event Button */}
                      <button
                        onClick={() => setShowEventModal(true)}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Event</span>
                      </button>
                      
                      {/* Article Button */}
                      <button
                        onClick={() => setShowArticleModal(true)}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Article</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={createPost}
                      disabled={loading || (!content.trim() && !selectedImage && !selectedVideo)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No posts yet. Be the first to share something!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username || 'User'}&background=0066cc&color=fff`}
                          alt="Profile"
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {post.profiles?.full_name || post.profiles?.username || 'Anonymous User'}
                          </h3>
                          <p className="text-xs text-gray-600">{formatTimeAgo(post.created_at)}</p>
                        </div>
                      </div>
                      
                      {user.id === post.user_id && (
                        <button
                          onClick={() => deletePost(post.id, post.user_id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Article Post Type */}
                    {post.post_type === 'article' && post.article_title && (
                      <div className="mb-3">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{post.article_title}</h2>
                        {post.article_subtitle && (
                          <p className="text-gray-600 text-sm mb-2">{post.article_subtitle}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Post Content */}
                    <p className="text-gray-800 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
                    
                    {/* Image Display */}
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Post content" 
                        className="w-full rounded-lg mb-3 max-h-96 object-cover"
                      />
                    )}
                    
                    {/* Video Display */}
                    {post.video_url && (
                      <video 
                        src={post.video_url} 
                        controls 
                        className="w-full rounded-lg mb-3 max-h-96"
                      />
                    )}
                    
                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          likes[post.id]?.liked 
                            ? 'text-blue-600 bg-blue-50' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5" fill={likes[post.id]?.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span className="text-sm font-medium">{likes[post.id]?.count || 0}</span>
                      </button>
                      
                      <button
                        onClick={() => handleComment(post.id)}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm font-medium">Comment</span>
                      </button>
                      
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span className="text-sm font-medium">Share</span>
                      </button>
                      
                      {user.id !== post.user_id && (
                        <button
                          onClick={() => following.includes(post.user_id) ? unfollowUser(post.user_id) : followUser(post.user_id)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            following.includes(post.user_id)
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {following.includes(post.user_id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                    
                    {/* Comment Section */}
                    {showComments[post.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-start space-x-2">
                          <img
                            src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0066cc&color=fff`}
                            alt="Profile"
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={commentTexts[post.id] || ""}
                              onChange={(e) => setCommentTexts(prev => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))}
                              placeholder="Add a comment..."
                              className="w-full border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => addComment(post.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Add to your feed</h3>
              <div className="space-y-3">
                {[
                  { name: 'Tech Innovators', followers: '12,453' },
                  { name: 'Startup Culture', followers: '8,921' },
                  { name: 'Design Systems', followers: '6,789' }
                ].map((suggestion, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{suggestion.name}</p>
                        <p className="text-xs text-gray-600">{suggestion.followers} followers</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Event</h2>
              <button onClick={() => setShowEventModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title *"
                value={eventData.title}
                onChange={(e) => setEventData({...eventData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={eventData.date}
                onChange={(e) => setEventData({...eventData, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={eventData.time}
                onChange={(e) => setEventData({...eventData, time: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={eventData.location}
                onChange={(e) => setEventData({...eventData, location: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={eventData.description}
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              
              <button
                onClick={createEventPost}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Modal */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Write Article</h2>
              <button onClick={() => setShowArticleModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Article title *"
                value={articleData.title}
                onChange={(e) => setArticleData({...articleData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Subtitle (optional)"
                value={articleData.subtitle}
                onChange={(e) => setArticleData({...articleData, subtitle: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div>
                <input
                  ref={articleImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setArticleData({...articleData, coverImage: file});
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => articleImageRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{articleData.coverImage ? articleData.coverImage.name : "Add cover image"}</span>
                </button>
              </div>
              
              <textarea
                placeholder="Write your article content *"
                value={articleData.content}
                onChange={(e) => setArticleData({...articleData, content: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={10}
              />
              
              <button
                onClick={createArticlePost}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? "Publishing..." : "Publish Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;