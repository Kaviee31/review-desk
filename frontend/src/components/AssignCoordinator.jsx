import { useState } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

function AssignCoordinator() {
  const [email, setEmail] = useState("");

  const handleAssign = async () => {
    if (!email) {
      toast.error("Please enter email.");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("User not found!");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Check if already has Coordinator role
      const currentRoles = userData.roles || [];
      if (currentRoles.includes("Coordinator")) {
        toast.info("User is already a Coordinator.");
        return;
      }

      // Update Firestore
      const updatedRoles = [...currentRoles, "Coordinator"];
      await updateDoc(doc(db, "users", userDoc.id), { roles: updatedRoles });

      toast.success("Coordinator role assigned successfully!");

    } catch (error) {
      console.error(error);
      toast.error("Failed to assign coordinator.");
    }
  };

  return (
    <div className="assign-coordinator">
      <h2>Assign Coordinator Role</h2>
      <input
        type="email"
        placeholder="Enter faculty email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleAssign}>Assign Coordinator</button>
    </div>
  );
}

export default AssignCoordinator;
