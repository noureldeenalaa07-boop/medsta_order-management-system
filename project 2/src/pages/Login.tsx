import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Package, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { staff } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-navy-950 p-4">
        <div className="glass-card p-8 max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-danger-500/15 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-danger-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Inactive</h2>
          <p className="text-navy-300 text-sm">Please contact the administrator to activate your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#627d98 1px, transparent 1px), linear-gradient(90deg, #627d98 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg shadow-primary-500/20">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Order Management System</h1>
          <p className="text-sm text-navy-400">Track and manage all your orders efficiently</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-6 p-1 bg-navy-800/50 rounded-xl">
            <button
              onClick={() => { setMode("signin"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === "signin" ? "bg-primary-600 text-white shadow-md shadow-primary-600/20" : "text-navy-300 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === "signup" ? "bg-primary-600 text-white shadow-md shadow-primary-600/20" : "text-navy-300 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-navy-400 mb-1.5 font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-navy-800/50 border border-navy-600/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-navy-400 mb-1.5 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-navy-800/50 border border-navy-600/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="example@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-navy-800/50 border border-navy-600/50 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-danger-500/10 border border-danger-500/30 text-danger-400 text-sm rounded-xl px-4 py-3 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium py-3 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-navy-500 mt-6">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
