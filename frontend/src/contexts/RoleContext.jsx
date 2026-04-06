import React, { createContext, useState } from "react";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

export const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(
    localStorage.getItem("currentRole") || ""
  );

  const updateRole = (role) => {
    setCurrentRole(role);
    localStorage.setItem("currentRole", role);

    const user = auth.currentUser;
    if (user) {
      updateDoc(doc(db, "users", user.uid), { activeRole: role }).catch((err) =>
        console.error("Failed to persist activeRole to Firestore:", err)
      );
    }
  };

  return (
    <RoleContext.Provider value={{ currentRole, updateRole }}>
      {children}
    </RoleContext.Provider>
  );
}
