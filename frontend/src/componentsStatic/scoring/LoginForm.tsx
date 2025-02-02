import React, { useState } from "react";

type LoginFormProps = {
  setSentenceData: React.Dispatch<
    React.SetStateAction<
      {
        _id: string;
        id: number;
        src: string;
        mt: string;
        ref: string;
        annotations: Object;
      }[]
    >
  >;
  setDBUsername: React.Dispatch<React.SetStateAction<string>>;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  setSentenceData,
  setDBUsername,
}) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null); // Reset error state before submitting

    if (!isNewUser) {
      try {
        const response = await fetch(
          "https://translation-correct-annotation-task-dutd.vercel.app/api/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          alert("Log in successful!");
          // Sort the data by our "id" column
          const sortedData = data.dataset.sort((a, b) => a.id - b.id);
          setSentenceData(sortedData);
          setDBUsername(username);
          console.log("Dataset:", data.dataset);
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
      } catch (err) {
        console.error("Error during login", err);
        setError("An unexpected error occurred. Please try again.");
      }
    } else {
      try {
        const response = await fetch(
          "https://translation-correct-annotation-task-dutd.vercel.app/api/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          alert("Registration successful! You can now log in.");
          setIsNewUser(false); // Switch back to login mode
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
      } catch (err) {
        console.error("Error during login/registration:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="login-form">
      <h2>{isNewUser ? "Register" : "Log In"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button className="login-button" type="submit">
          {isNewUser ? "Register" : "Log In"}
        </button>
        <button className="login-button">Log Out</button>
      </form>

      <p>
        {isNewUser ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          className="login-button"
          type="button"
          onClick={() => {
            setIsNewUser(!isNewUser);
            setError(null); // Clear any existing errors
          }}
        >
          {isNewUser ? "Log In" : "Register"}
        </button>
      </p>
    </div>
  );
};
