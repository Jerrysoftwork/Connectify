import { useState } from "react";
import { supabase } from "../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Email/Password Sign Up
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMsg(`❌ Signup failed: ${error.message}`);
    } else {
      alert("✅ Signup successful! Check your email to confirm.");
      setErrorMsg("");
    }
  };

  // Email/Password Sign In
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(`❌ Login failed: ${error.message}`);
    } else {
      window.location.href = "/feed"; // redirect after login
    }
  };

  // Google OAuth Login
  const signInWithGoogle = async () => {
    const redirectTo =
      window.location.hostname === "localhost"
        ? "http://localhost:5173/feed" // 👈 local redirect
        : "https://yvdjtaaphmztiaigawow.supabase.co/auth/v1/callback?redirect=/feed"; 
        // 👈 production redirect via Supabase

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMsg(`❌ Google login failed: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-lg text-center w-80">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Connectify 🚀</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-2 w-full border rounded px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full border rounded px-3 py-2"
        />

        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

        <button
          onClick={signIn}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2 hover:bg-blue-700"
        >
          Login
        </button>

        <button
          onClick={signUp}
          className="bg-green-600 text-white px-4 py-2 rounded w-full mb-2 hover:bg-green-700"
        >
          Register
        </button>

        <button
          onClick={signInWithGoogle}
          className="bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
