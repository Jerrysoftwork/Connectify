import { useState } from "react";
import { supabase } from "../supabaseClient"; // fixed path

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sign up new user
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      if (error.message.includes("401")) {
        setErrorMsg("❌ Email/Password signup is not enabled in Supabase.");
      } else {
        setErrorMsg(`❌ Signup failed: ${error.message}`);
      }
    } else {
      alert("✅ Signup successful! Please check your email to confirm.");
      setErrorMsg("");
    }
  };

  // Sign in existing user
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(`❌ Login failed: ${error.message}`);
    } else {
      window.location.href = "/feed"; // redirect to feed
    }
  };

  // Google login
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      setErrorMsg(`❌ Google login failed: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-lg text-center w-80">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Connectify 🚀</h1>

        {/* Email input */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-2 w-full border rounded px-3 py-2"
        />

        {/* Password inpu*
