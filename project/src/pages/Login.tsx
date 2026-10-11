import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Package } from "lucide-react";

export default function Login() {
  const { staff } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: staffError } = await supabase.from("staff").insert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: "admin",
          });
          if (staffError) throw staffError;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (staff && !staff.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="glass-card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-2">Account Inactive</h2>
          <p className="text-navy-300">Please contact the administrator to activate your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative glass-card p-8 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Order Management</h1>
            <p className="text-sm text-navy-300">Track and manage all your orders</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-navy-800/50 rounded-lg">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "signin" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "signup" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input-field"
                placeholder="Enter your full name"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-navy-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="example@company.com"
            />
          </div>
          <div>
            <label className="block text-sm text-navy-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm rounded-lg px-4 py-3 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
