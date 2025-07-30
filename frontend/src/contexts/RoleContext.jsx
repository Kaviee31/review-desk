import React, { createContext, useState } from "react";

export const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(
    localStorage.getItem("currentRole") || ""
  );

  const updateRole = (role) => {
    setCurrentRole(role);
    localStorage.setItem("currentRole", role);
  };

  return (
    <RoleContext.Provider value={{ currentRole, updateRole }}>
      {children}
    </RoleContext.Provider>
  );
}
