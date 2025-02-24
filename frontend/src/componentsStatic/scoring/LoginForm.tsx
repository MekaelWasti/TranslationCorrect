import React, { useState, useEffect } from "react";

type LoginFormProps = {
  setDataset: React.Dispatch<any>;
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
  setDataset,
  setSentenceData,
  setDBUsername,
}) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedPassword = localStorage.getItem("password");
    // localStorage.removeItem("username");
    if (storedUsername && storedPassword) {
      // console.log("AH LOGGED IN");
      // setUsername(storedUsername);
      setUsername(storedUsername);
      setPassword(storedPassword);
      setTimeout(() => {
        // handleSubmit(storedUsername, storedPassword);
      }, 0);
    }
  }, []);

  const handleSubmit = async (
    inputUsername?: string,
    inputPassword?: string
  ) => {
    setError(null); // Reset error state before submitting

    const user = inputUsername || username;
    const pass = inputPassword || password;
    if (!user || !pass) return; // Prevent empty login attempt

    if (!isNewUser) {
      try {
        const response = await fetch(
          "https://translation-correct-annotation-task-dutd.vercel.app/api/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            // body: JSON.stringify({ username, password }),
            body: JSON.stringify({ username: user, password: pass }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem("username", user); // TEMPORARY METHOD TO PRESERVE LOG IN STATE
          localStorage.setItem("password", pass); // TEMPORARY METHOD TO PRESERVE LOG IN STATE
          // alert("Log in successful!");

          // Sort the data by our "id" column
          Object.keys(data).forEach((key) => {
            if (Array.isArray(data[key])) {
              data[key].sort((a, b) => a.id - b.id);
            }
          });

          setDataset(data);

          setDBUsername(username);
          // console.log("Dataset:", data.dataset);
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
          handleSubmit(username, password);
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
