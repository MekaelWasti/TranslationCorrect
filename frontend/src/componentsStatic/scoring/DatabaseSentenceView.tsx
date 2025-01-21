import React, { useState, useEffect } from "react";
import { LoginForm } from "./LoginForm";
import "../../index.css";
import sentences from "../../../public/mandarin_dataset.json";
import checkmark from "../../assets/checkmark.svg";
import cross from "../../assets/x_cross.svg";

export const DatabaseSentenceView: React.FC = () => {
  const [sentenceData, setSentenceData] = useState<
    {
      id: number;
      src: string;
      mt: string;
      ref: string;
      completedCheck: boolean;
    }[]
  >([]);

  useEffect(() => {
    fetch("/mandarin_dataset.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        console.log("AH YEAH");
        return response.json();
      })
      .then((data) => setSentenceData(data))
      .catch((error) => {
        console.error("Error loading json sentence data", error);
      });
  }, []);

  return (
    <div>
      <LoginForm></LoginForm>
      <div className="db-sentence-view">
        <table>
          <thead>
            <tr>
              <th>Index</th>
              <th>Sentence</th>
              <th>MT</th>
              <th>Reference</th>
              <th>Complete</th>
            </tr>
          </thead>
          <tbody>
            {sentenceData.length > 0 ? (
              sentenceData.map((item) => (
                <tr key={item.id}>
                  <td className="index-cell">{item.id}</td>
                  <td className="sentence-cell">{item.src}</td>
                  <td className="sentence-cell">{item.mt}</td>
                  <td className="sentence-cell">{item.ref}</td>
                  <td className="status-cell">
                    {item.completedCheck ? (
                      <img
                        className="annotation-checkmark"
                        src={checkmark}
                        alt=""
                      />
                    ) : (
                      <img className="annotation-cross" src={cross} alt="" />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td>Loading data...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
