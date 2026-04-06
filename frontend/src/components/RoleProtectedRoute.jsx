import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function RoleProtectedRoute({ children, allowedRoles }) {
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (mounted) setAuthorized(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        if (mounted) setAuthorized(false);
        return;
      }

      const userData = userSnap.data();
      const roles = userData.roles || [userData.profession || userData.userType];
      if (roles.includes("HOD") && !roles.includes("Teacher")) {
        roles.push("Teacher");
      }
      if (roles.includes("Admin") && !roles.includes("Teacher")) {
        roles.push("Teacher");
      }
      const hasAccess = roles.some(role => allowedRoles.includes(role));
      if (mounted) setAuthorized(hasAccess);
    };

    checkRole();
    return () => { mounted = false; };
  }, [allowedRoles]);

  if (authorized === null) return <p>Loading...</p>;
  if (!authorized) return <Navigate to="/" replace />;
  return children;
}

export default RoleProtectedRoute;
