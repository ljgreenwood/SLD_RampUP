import { useState } from "react";
import "./App.css";
import AudioRecorder from "./assets/AudioRecorder";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";

// I SWEAR I WRITE MY OWN COMMENTS I JUST SOUND LIKE CHATGPT LMAO //

// required for filepond to render image previews (cool ui)
registerPlugin(FilePondPluginImagePreview);

function App() {
  // initially configures using the File "type" object but instead used the any type to ensure compatibility with FilePond bc i have no idea what
  // filepond is doing under the hood ngl
  const [files, setfiles] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<string>("");

  /**
   *
   * @returns void
   * @abstract handler for the upload button, uses the files
   */
  const handleUpload = async () => {
    if (!files || files.length === 0)
      return alert("You must select a file first.");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file" + String(i), files[i].file); // FilePond stores actual file as an attributes
    }

    /**
     * post request to the backend
     * expects a json response with the transcription and a download url for the .txt file
     *
     * posts the files as form data with file0, file1, file2 ....
     */
    const res = await fetch("http://127.0.0.1:5000/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Transcription failed.");
      return;
    }

    const data = await res.json();
    setTranscription(data.transcription);
    window.open(data.download_url, "_blank");
  };

  return (
    <div className="App">
      <h1>Speech Language Development Research Tool</h1>
      <p>
        Upload a file or use the native recording tool to record your tests.
      </p>
      <div className="flex-container">
        <AudioRecorder setFiles={setfiles} />
        <FilePond
          files={files}
          onupdatefiles={setfiles}
          allowMultiple={true}
          maxFiles={3}
          acceptedFileTypes={["audio/mp3"]}
          name="files"
          labelIdle="Drag & Drop your files or <span class='filepond--label-action'>Browse</span>"
        />
        <button onClick={handleUpload} disabled={files.length === 0}>
          Transcribe
        </button>
      </div>
      {transcription && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Transcription:</h3>
          <pre>{transcription}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
