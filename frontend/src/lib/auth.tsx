"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
    id: string;
    email: string;
    name: string;
    subscription_status: string;
    invoices_this_month?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("invoq_token");
        localStorage.removeItem("invoq_user");
    }, []);

    const refreshUser = useCallback(async () => {
        const savedToken = localStorage.getItem("invoq_token");
        if (!savedToken) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${savedToken}` },
            });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                setToken(savedToken);
            } else {
                logout();
            }
        } catch {
            // Server might be down — keep local data
            const savedUser = localStorage.getItem("invoq_user");
            if (savedUser) {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            }
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Login failed");
        }
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("invoq_token", data.token);
        localStorage.setItem("invoq_user", JSON.stringify(data.user));
    };

    const register = async (email: string, password: string, name: string) => {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Registration failed");
        }
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("invoq_token", data.token);
        localStorage.setItem("invoq_user", JSON.stringify(data.user));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
