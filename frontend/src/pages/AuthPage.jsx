import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthPage({ mode }) {
  const isUp = mode === "signup";
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = isUp ? form : { email: form.email, password: form.password };
      const { data } = await api.post(isUp ? "/auth/signup" : "/auth/signin", body);
      signIn(data);
      navigate("/habits");
    } catch (err) {
      setError(errorText(err));
    } finally { setBusy(false); }
  };

  const title = isUp ? "Sign up" : "Sign in";
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:block bg-cover bg-center relative" style={{ backgroundImage: "url(https://images.pexels.com/photos/34061/pexels-photo.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)" }}>
        <div className="absolute inset-0 bg-[#2C382A]/35" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-heading text-4xl font-extrabold leading-tight">Small habits,<br />kept together.</p>
          <p className="mt-3 text-white/85">Track daily, share what you like, talk it through with your circle.</p>
        </div>
      </div>
      <div className="flex items-center px-8 md:px-16 py-12">
        <form onSubmit={submit} className="w-full max-w-sm fade-up" data-testid={`${mode}-form`}>
          <div className="flex items-center gap-2 font-heading font-extrabold text-[#2C382A] mb-10">
            <Sprout className="w-5 h-5 text-[#4A6741]" /> Habit Circle
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-8">{title}</h1>
          {isUp && (
            <label className="block mb-5">
              <span className="label-caps">Display name</span>
              <input className="field mt-2" required value={form.display_name} onChange={set("display_name")} data-testid="display-name-input" />
            </label>
          )}
          <label className="block mb-5">
            <span className="label-caps">Email</span>
            <input className="field mt-2" type="email" required value={form.email} onChange={set("email")} data-testid="email-input" />
          </label>
          <label className="block mb-6">
            <span className="label-caps">Password</span>
            <input className="field mt-2" type="password" required minLength={isUp ? 6 : undefined} value={form.password} onChange={set("password")} data-testid="password-input" />
          </label>
          {error && <p className="text-sm text-[#B4492F] mb-4" data-testid="auth-error">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full" data-testid={`${mode}-submit-button`}>{title}</button>
          <p className="mt-6 text-sm text-[#758271]">
            {isUp ? "Already have an account? " : "New here? "}
            <Link to={isUp ? "/signin" : "/signup"} className="text-[#4A6741] font-semibold hover:underline" data-testid="switch-auth-link">
              {isUp ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
