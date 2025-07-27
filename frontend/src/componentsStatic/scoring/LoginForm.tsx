import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_BASE;

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
  const [successfullLogin, setSuccessfullLogin] = useState<boolean>(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedPassword = localStorage.getItem("password");
    // localStorage.removeItem("username");
    if (storedUsername && storedPassword) {
      // console.log("AH LOGGED IN");
      // setUsername(storedUsername);
      console.log("Found stored credentials, attempting auto-login");
      setUsername(storedUsername);
      setPassword(storedPassword);

      // Auto-login with stored credentials
      // Use a small timeout to ensure state is updated before submitting
      setTimeout(() => {
        handleSubmit(storedUsername, storedPassword);
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
          // "https://translation-correct-annotation-task-dutd.vercel.app/api/login",
          `${API_BASE}/api/login`,
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

          // Store credentials in localStorage for persistent login
          localStorage.setItem("username", user);
          localStorage.setItem("password", pass);

          // Set login state
          toast.success("Login successful!");
          setSuccessfullLogin(true);
          setDBUsername(user); // Important: use the user parameter, not username state

          // Sort the data by our "id" column
          Object.keys(data).forEach((key) => {
            if (Array.isArray(data[key])) {
              data[key].sort((a, b) => a.id - b.id);
            }
          });

          setDataset(data);

          // console.log("Dataset:", data.dataset);
        } else {
          setError(data.error || "Something went wrong. Please try again.");
          toast.error(data.error || "Login failed");
          setSuccessfullLogin(false);
        }
      } catch (err) {
        console.error("Error during login", err);
        setError("An unexpected error occurred. Please try again.");
        toast.error("An unexpected error occurred. Please try again.");
        setSuccessfullLogin(false);
      }
    } else {
      try {
        const response = await fetch(
          // "https://translation-correct-annotation-task-dutd.vercel.app/api/register",
          `${API_BASE}/api/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          }
        );

        // const data = await response.json();
        // Safer version below
        const isJson = response.headers
          .get("content-type")
          ?.includes("application/json");
        const data = isJson
          ? await response.json()
          : { error: await response.text() };

        if (response.ok) {
          // alert("Registration successful! You can now log in.");
          toast.success("Registration successful! You can now log in.");
          setIsNewUser(false); // Switch back to login mode
        } else {
          setError(data.error || "Something went wrong. Please try again.");
          toast.error(data.error || "Registration failed");
          setSuccessfullLogin(false);
        }
      } catch (err) {
        console.error("Error during login/registration:", err);
        setError("An unexpected error occurred. Please try again.");
        toast.error("An unexpected error occurred. Please try again.");
        setSuccessfullLogin(false);
      }
    }
  };

  return (
    <div className="login-form">
      <h1 className="login-form-title">
        {isNewUser
          ? "Please Register to Annotate"
          : "Please Log In to Annotate"}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(username, password);
        }}
      >
        <div className="login-form-input">
          <label className="login-username-label" htmlFor="username">
            Username:
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="login-form-input">
          <label className="login-password-label" htmlFor="password">
            Password:
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {!successfullLogin && error && <p style={{ color: "red" }}>{error}</p>}
        {successfullLogin && <p style={{ color: "green" }}>{error}</p>}

        <div className="login-buttons-container">
          <button
            className={`login-button ${successfullLogin ? "active" : ""}`}
            type="submit"
          >
            {isNewUser ? "Register" : "Log In"}
          </button>
          {/* <button className="login-button" type="button"> */}
          {/* Log Out */}
          {/* </button> */}
        </div>
      </form>

      <div className="login-toggle-container">
        <span>
          <h3>
            {isNewUser ? "Already have an account?" : "Don't have an account?"}
          </h3>
        </span>
        <button
          className="login-button"
          type="button"
          onClick={() => {
            setIsNewUser(!isNewUser);
            setError(null);
          }}
        >
          {isNewUser ? "Log In" : "Register"}
        </button>
      </div>
    </div>
  );
};
