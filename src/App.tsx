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
  const [transcription, setTranscription] = useState<string>("");
  const [currPath, setCurrPath] = useState<string>("");
  const [currTranscriptionIndex, setCurrTranscriptionIndex] =
    useState<number>(0);

  /**
   * @returns void
   * @abstract handler for the upload button, uses the files
   */
  const handleUpload = async () => {
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

  return (
    <div className="App">
      <h1>Speech Language Development Research Tool</h1>
      <p>
        Upload a file or use the native recording tool to record your tests.
      </p>
      <div className="flex-container">
        {/* <AudioRecorder setFiles={setfiles} /> */}
        <FilePond
          files={files}
          onupdatefiles={setfiles}
          allowMultiple={true}
          maxFiles={3}
          acceptedFileTypes={["audio/mp3"]}
          name="file"
          labelIdle="Drag & Drop your files or <span class='filepond--label-action'>Browse</span>"
        />
        <button onClick={handleUpload} disabled={files.length === 0}>
          Transcribe
        </button>
      </div>

      {
        // add logic here to allow for the modification of the current transcription
        // index and thus the displayed transcription
        transcription && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Transcription: {currPath}</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                backgroundColor: "#f8f8f8",
                padding: "0.75rem",
                borderRadius: "8px",
              }}
            >
              {transcription}
            </pre>
          </div>
        )
      }
    </div>
  );
}

export default App;
