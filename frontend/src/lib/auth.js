import { createContext, useContext, useEffect, useState, createElement } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) return setUser(false);
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("token");
      setUser(false);
    });
  }, []);

  const signIn = (data) => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };
  const signOut = () => {
    localStorage.removeItem("token");
    setUser(false);
  };

  return createElement(AuthContext.Provider, { value: { user, signIn, signOut } }, children);
}

export const useAuth = () => useContext(AuthContext);
