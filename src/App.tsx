import { useState } from "react";
import "./App.css";
// import AudioRecorder from "./assets/AudioRecorder";
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
  const [transcription, setTranscription] = useState<string | null>(null);
  const [currPath, setCurrPath] = useState<string>("");
  const [currTranscriptionIndex, setCurrTranscriptionIndex] =
    useState<number>(0);
  /**
   * @returns void
   * @abstract handler for the upload button, uses the files
   */
  const handleUpload = async () => {
    setTranscription("");
    console.log("Uploading files:", files);
    if (!files || files.length === 0)
      return alert("You must select a file first.");
    let transcriptions: { transcription: string; download_url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i].file); // FilePond stores actual file as an attributes
      console.log("pre-post", files);
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
      } else console.log("post complete");

      const data = await res.json();
      transcriptions.push(data);
    }
    // this should be zero because it cannot be manipulated until transcript usestate is set from null
    setCurrTranscriptionIndex(0);
    setTranscription(transcriptions[currTranscriptionIndex].transcription);
    setCurrPath(transcriptions[currTranscriptionIndex].download_url);
    console.log("Finished:", currPath);
  };

  function downloadFile(currPath: string): void {
    console.log("Downloading file:", currPath);
    window.open(currPath, "_blank");
  }

  return (
    <div className="App">
      <h1>Speech Language Development Research Tool</h1>
      <div className="container">
        <div className="left-half">
          <h3>Test Content</h3>
          <FilePond
            files={files}
            onupdatefiles={setfiles}
            allowMultiple={true}
            maxFiles={3}
            acceptedFileTypes={[
              "audio/mp3",
              "audio/wav",
              "audio/webm",
              "audio/m4a",
            ]}
            name="file"
            labelIdle="Drag & Drop or <span class='filepond--label-action'>Browse</span> (mp3; wav; webm)"
          />
          <button
            onClick={handleUpload}
            disabled={files.length === 0}
            className="custom-button"
          >
            Transcribe
          </button>
        </div>
        <div className="right-half">
          <h3>Transcription Results</h3>
          {(transcription == null && <></>) ||
            (transcription == "" && (
              <div className="awaiting-results">
                <h3>Awaiting Results</h3>
                <div className="spinner" />
                <style>
                  {`
              @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
              }
            `}
                </style>
              </div>
            )) ||
            (transcription && (
              <div style={{ marginTop: "1rem" }}>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    backgroundColor: "#f8f8f8",
                    height: "20vh",
                    overflowY: "scroll",
                    textAlign: "left",
                    padding: "0.75rem",
                    borderRadius: "8px",
                  }}
                >
                  {transcription}
                </pre>
                <button
                  onClick={() => downloadFile(currPath)}
                  className="custom-button"
                >
                  Download This Transcript
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;
