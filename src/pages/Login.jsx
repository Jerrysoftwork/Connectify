import { useState } from "react";
import { supabase } from "../../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const signUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setErrorMsg(error.message);
    else alert("Signup successful! Please check your email.");
  };

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setErrorMsg(error.message);
    else window.location.href = "/feed";
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) setErrorMsg(error.message);
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

        <button
          onClick={signIn}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 mb-2"
        >
          Login
        </button>
        <button
          onClick={signUp}
          className="bg-gray-600 text-white px-4 py-2 rounded w-full hover:bg-gray-700 mb-2"
        >
          Sign Up
        </button>
        <button
          onClick={signInWithGoogle}
          className="bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700"
        >
          Login with Google
        </button>

        {errorMsg && <p className="text-red-500 mt-4">{errorMsg}</p>}
      </div>
    </div>
  );
}

export default Login;
import { useState } from "react";
import { supabase } from "../../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const signUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setErrorMsg(error.message);
    else alert("Signup successful! Please check your email.");
  };

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setErrorMsg(error.message);
    else window.location.href = "/feed";
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) setErrorMsg(error.message);
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

        <button
          onClick={signIn}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 mb-2"
        >
          Login
        </button>
        <button
          onClick={signUp}
          className="bg-gray-600 text-white px-4 py-2 rounded w-full hover:bg-gray-700 mb-2"
        >
          Sign Up
        </button>
        <button
          onClick={signInWithGoogle}
          className="bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700"
        >
          Login with Google
        </button>

        {errorMsg && <p className="text-red-500 mt-4">{errorMsg}</p>}
      </div>
    </div>
  );
}

export default Login;
