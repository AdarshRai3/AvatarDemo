import React from "react";
import AvatarViewer from "./component/AvatarViewer" 

function App() {
  const avatarUrl = "https://models.readyplayer.me/67af11145cbda0313498bf57.glb"; // Replace with your actual URL

  return (
    <div>
      <h1>AceInt AI Assistant</h1>
      <AvatarViewer glbUrl={avatarUrl} />
    </div>
  );
}

export default App;
