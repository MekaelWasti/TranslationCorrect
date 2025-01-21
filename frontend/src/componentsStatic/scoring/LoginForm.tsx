import React, { useState } from "react";

type LoginFormProps = {};

export const LoginForm: React.FC<LoginFormProps> = ({}) => {
  const [username, setUsername] = useState("Mekael");
  const [password, setPassword] = useState("AT");
  const [isNewUser, setIsNewUser] = useState(false);

  const handleCheckUser = async () => {
    try {
      const response = await fetch("/api/get", {
        method: "GET",
      });

      const users = await response.json();

      // Check if the username and password exist in the returned users
      const userExists = users.some(
        (user: { username: string; password: string }) =>
          user.username === username && user.password === password
      );

      setIsNewUser(!userExists); // If user doesn't exist, they are new
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch("/api/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        alert("Registration successful! You can now log in.");
        setIsNewUser(false);
      } else {
        alert("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Failed to register user:", error);
    }
  };

  const handleLogin = async () => {
    await handleCheckUser(); // Recheck if the user exists
    if (!isNewUser) {
      alert("Login successful!");
    } else {
      alert("User does not exist. Please register first.");
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={handleCheckUser} // Check user existence when they stop typing
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {!isNewUser ? (
        <button onClick={handleLogin}>Log In</button>
      ) : (
        <button onClick={handleRegister}>Register</button>
      )}
    </div>
  );
};
