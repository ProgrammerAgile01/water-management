"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: "admin" | "petugas_catat" | "warga";
}

interface User {
  username: string;
  role: "admin" | "petugas_catat" | "warga";
  name: string;
  loginTime: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem("tb_user");
        if (userData) {
          const parsedUser = JSON.parse(userData) as User;
          setUser(parsedUser);

          if (requiredRole) {
            // Admin can access everything
            if (parsedUser.role === "admin") {
              // Allow access
            }
            // Petugas can access petugas-specific pages
            else if (
              requiredRole === "petugas_catat" &&
              parsedUser.role === "petugas_catat"
            ) {
              // Allow access
            }
            // Warga can only access warga-specific pages
            else if (requiredRole === "warga" && parsedUser.role === "warga") {
              // Allow access
            }
            // If role doesn't match, redirect to unauthorized
            else if (parsedUser.role !== requiredRole) {
              router.push("/unauthorized");
              return;
            }
          }
        } else {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-primary">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-lg">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
