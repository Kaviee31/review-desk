import React, { useState } from 'react';
import { getAuth, updatePassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../styles/ChangePassword.css"
import Lottie from 'lottie-react';
import animationData from '../assets/password-lock.json';

function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const auth = getAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    const user = auth.currentUser;

    if (user) {
      try {
        await updatePassword(user, newPassword);
        toast.success("Password updated successfully!");
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error("Error updating password:", error);
        if (error.code === "auth/requires-recent-login") {
          toast.error("Please log in again and try.");
        } else {
          toast.error("Failed to change password.");
        }
      }
    }
  };

  return (
    <div className="change-password">
         <div style={{ maxWidth: 200, margin: "0 auto" }}>
        <Lottie animationData={animationData} loop={true} />
      </div>
      <h2>🔐 Change Password</h2>
      <form onSubmit={handleChangePassword}>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
}

export default ChangePassword;
