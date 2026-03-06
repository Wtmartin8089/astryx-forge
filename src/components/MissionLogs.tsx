import { useState } from "react";
import { db, storage } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";

function MissionLogs() {
  const [logText, setLogText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const auth = getAuth();
  const user = auth.currentUser;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Please log in.");
      return;
    }

    let attachmentUrl = "";
    if (file) {
      const storageRef = ref(storage, `missionAttachments/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      attachmentUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "missionLogs"), {
      logText,
      attachmentUrl,
      createdAt: serverTimestamp(),
      author: user.email || user.uid,
    });

    setLogText("");
    setFile(null);
    alert("Mission log submitted!");
  };

  return (
    <div className="lcars-container">
      <h2>Mission Logs</h2>
      <textarea
        value={logText}
        onChange={(e) => setLogText(e.target.value)}
        placeholder="Captain's Log..."
      ></textarea>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default MissionLogs;

