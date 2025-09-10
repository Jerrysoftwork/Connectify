import { supabase } from "../../supabaseClient"

function Login() {
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    })
    if (error) console.error(error)
    else console.log("Login success:", data)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white shadow-lg rounded-lg text-center w-80">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Connectify 🚀</h1>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700"
        >
          Login with Google
        </button>
      </div>
    </div>
  )
}

export default Login
