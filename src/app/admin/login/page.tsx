"use client";

import { useAuth } from "@clerk/nextjs";
import AdminLoginForm from "./login-form";

export default function AdminLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="page-wrapper">
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="page-wrapper">
        <div className="center-card glass-card" style={{ textAlign: "center" }}>
          <h2>Redirecting...</h2>
        </div>
      </div>
    );
  }

  return <AdminLoginForm />;
}
