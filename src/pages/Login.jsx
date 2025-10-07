import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email/Password Sign Up
  const signUp = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password 
      });

      if (error) {
        setErrorMsg(`❌ Signup failed: ${error.message}`);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        // Create profile for new user
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            username: email.split("@")[0].toLowerCase(),
            full_name: email.split("@")[0],
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`,
            bio: "Hello! I just joined 🚀",
          },
        ]);

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      }

      alert("✅ Signup successful! Please check your email to confirm your account.");
      setErrorMsg("");
    } catch (err) {
      console.error("Unexpected error during signup:", err);
      setErrorMsg("An unexpected error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign In
  const signIn = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter both email and password");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        setErrorMsg(`❌ Login failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data.user) {
        navigate("/feed");
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      setErrorMsg("An unexpected error occurred during login");
      setLoading(false);
    }
  };

  // Google OAuth Login
  const signInWithGoogle = async () => {
    setLoading(true);
    setErrorMsg("");

    const redirectTo =
      window.location.hostname === "localhost"
        ? "http://localhost:5173/feed" // local
        : "https://connectify-ivory.vercel.app/feed"; // production

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setErrorMsg(`❌ Google login failed: ${error.message}`);
        setLoading(false);
      }
      // Note: Don't set loading to false here as the page will redirect
    } catch (err) {
      console.error("Unexpected error during Google login:", err);
      setErrorMsg("An unexpected error occurred during Google login");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      signIn();
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-8 bg-white shadow-2xl rounded-2xl text-center w-96 max-w-md">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-blue-600">Connectify</h1>
          <p className="text-gray-600">Connect with friends and share your thoughts</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={signIn}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg w-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-3 rounded-lg w-full hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? "Connecting..." : "Continue with Google"}</span>
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}

export default Login;