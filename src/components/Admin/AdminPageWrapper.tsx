import React from "react";
import AdminProtectedRoute from "./AdminProtectedRoute";

interface AdminPageWrapperProps {
  children: React.ReactNode;
}

const AdminPageWrapper: React.FC<AdminPageWrapperProps> = ({ children }) => {
  return <AdminProtectedRoute>{children}</AdminProtectedRoute>;
};

export default AdminPageWrapper;
