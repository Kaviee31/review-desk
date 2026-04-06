import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h1 style={{ fontSize: "6rem", margin: 0 }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Go to Login</Link>
    </div>
  );
}

export default NotFound;
