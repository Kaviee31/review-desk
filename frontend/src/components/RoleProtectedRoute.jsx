import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

function RoleProtectedRoute({ children, allowedRoles }) {
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setAuthorized(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setAuthorized(false);
        return;
      }

      const userData = userSnap.data();
      const roles = userData.roles || [userData.profession || userData.userType];
      if (roles.includes("HOD") && !roles.includes("Teacher")) {
        roles.push("Teacher");
      }
      const hasAccess = roles.some(role => allowedRoles.includes(role));
      setAuthorized(hasAccess);
    };

    checkRole();
  }, [allowedRoles]);

  if (authorized === null) return <p>Loading...</p>;
  if (!authorized) return <Navigate to="/" replace />;
  return children;
}

export default RoleProtectedRoute;
