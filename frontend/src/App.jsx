import { useEffect, useState } from "react";

function App() {
  const [response, setResponse] = useState("");
  const [age, setAge] = useState("");

  const sendData = () => {
    fetch("http://localhost:8000/test", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({age: Number(age)})
    })
      .then(res => res.json())
      .then(data => setResponse(data.message));
  };

  return(
    <div>
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        />
      <button onClick={sendData}>Send Data</button>
      <h1>{response}</h1>
    </div>
  );
}

export default App;