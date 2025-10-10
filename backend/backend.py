from flask import Flask, request, send_file, jsonify
from dotenv import load_dotenv
import whisper, json, subprocess, os
from flask_cors import CORS

load_dotenv()  # take environment variables from .env config file
app = Flask(__name__)
CORS(app)
model = whisper.load_model("turbo") 
# load the Whisper turbo model (best general performance - we can experiment with other models in the future)

# post routing for transcription command - expects an audio file in the request
@app.route("/transcribe", methods=["POST"])
def transcribe():
    print("Received request to transcribe file")
    # no files are attached to the request then throw an error
    if not request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # grab the first file in the request (only one is expected)
    audio = request.files["file"]
    audio_path = f"/tmp/{audio.filename}"  # create a path to save the audio file temporarily in the backend
    audio.save(audio_path) # save it (woaaaah no way)

    # the model expects a single channel 16kHz wav file so we have to convert the incoming files using the ffmpeg utility
    processed_path = audio_path.rsplit(".", 1)[0] + "_clean.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", audio_path,
        "-ac", "1", "-ar", "16000", "-f", "wav", processed_path
    ], check=True)

    # this is wrapped in a try catch because whisper will throw an error if it tries to process an empty segment and
    # there are obviously a lot of those in real world files, i want a clean log please and thank you
    try:
        result = model.transcribe(
            processed_path,
            language="en",
            temperature=0.0,
            word_timestamps=True,
            prompt=os.getenv("PROMPTVAR", ""), # the selected prompt is configured in the .env file ( not included in git for security )
        )
    except RuntimeError as e:
        if "0 elements" in str(e):
            print("Whisper skipped processing an empty segment of audio.")
        else:
            raise # now ts is actually important LMAO
    
    # formatting the output a little nicer for later inspection
    output = {
        "text": result["text"], # full text transcript
        "segments": result.get("segments", []), # word level timestamps
        "language": result.get("language", "unknown"), # detected language (just in case its detecting non-english for some reason)
        #TODO: use the language detection to see if turbo is fine or we need to use an en-specific model
    }

    with open("transcription.json", "w") as f: # write out the transcript json file so that we can debug later ykyk
        json.dump(output, f, indent=2)

    print("Transcription complete:", result["text"]) # for debugging (log to the terminal)
    
    txt_path = audio_path.replace(".mp3", ".txt") # make a new path for the text file output
    with open(txt_path, "w") as out:
        out.write(result["text"])

    print("audio path:", audio_path, "processed path:", processed_path, "txt path:", txt_path) # more debugging

    # exit by returning just the text and the text download path because thats all the frontend needs
    return jsonify({
        "transcription": result["text"],
        "download_url": f"http://127.0.0.1:5000/download/{os.path.basename(txt_path)}"
    })

# backend route to download the transcription file
@app.route("/download/<filename>")
def download(filename):
    return send_file(f"/tmp/{filename}", as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
    # try using host="0.0.0.0"