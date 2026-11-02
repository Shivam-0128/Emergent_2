import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sprout, ListChecks, Users, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/habits", label: "My habits", icon: ListChecks, id: "my-habits" },
  { to: "/community", label: "Community", icon: Users, id: "community" },
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = () => { signOut(); navigate("/signin"); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-[#FDFBF7] border-b border-[#E8E6DF]">
        <div className="flex items-center gap-6 px-6 md:px-10 h-16">
          <Link to="/habits" className="flex items-center gap-2 font-heading font-extrabold text-lg text-[#2C382A]" data-testid="brand-link">
            <Sprout className="w-5 h-5 text-[#4A6741]" /> Habit Circle
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end data-testid={`top-nav-${l.id}`}
                className={({ isActive }) => `px-3 py-1.5 rounded-full transition-colors ${isActive ? "bg-[#E9EFE5] text-[#3D5636] font-semibold" : "text-[#4A5D47] hover:bg-[#F2EFE7]"}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-[#758271]" data-testid="current-user-name">{user.display_name}</span>
            <button onClick={handleSignOut} data-testid="sign-out-button"
              className="flex items-center gap-1.5 text-sm font-medium border border-[#E8E6DF] rounded-full px-4 py-1.5 hover:bg-[#F2EFE7] transition-colors">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden md:flex w-56 shrink-0 flex-col gap-2 border-r border-[#E8E6DF] px-4 py-10" data-testid="sidebar">
          <p className="label-caps px-3 mb-2">Go to</p>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end data-testid={`sidebar-${l.id}-button`}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-[#4A6741] text-white" : "text-[#4A5D47] hover:bg-[#F2EFE7]"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </NavLink>
          ))}
        </aside>
        <main className="flex-1 px-6 md:px-12 py-10 min-w-0">{children}</main>
      </div>
    </div>
  );
}
