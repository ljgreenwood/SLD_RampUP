# DOTENV : environment variable management
# FLASK : process requests and send_files to frontend (json format)
# WHISPER : interfacing with the model which is based in the environment (I suggest conda)
# FFMPEG : command line utility for audio processing (used via subprocess)
# FLASK_CORS : to allow cross origin requests from the frontend
from datetime import datetime
from flask import Flask, request, send_file, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
import whisper, json, subprocess, os, urllib.parse

load_dotenv()
app = Flask(__name__)
CORS(app)
model = whisper.load_model("turbo") 
# load the whisper model into memory (if not already stored : turbo is a balanced choice but en models coult be used)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    print("Received request to transcribe file")
    if not request.files:
        return jsonify({"error": "No file uploaded"}), 400

    # grab the first file in the request (only one is expected)
    audio = request.files["file"]
    audio_path = f"/tmp/{audio.filename}"  # create a path to save the audio file temporarily in the backend
    audio.save(audio_path)

    # convert to 16kHz wav file with ffmpeg for whisper model compatibility
    processed_path = audio_path.rsplit(".", 1)[0] + "_clean.wav" # take that path and change output extension to _clean.wav
    subprocess.run([
        "ffmpeg", "-y", "-i", audio_path, # (input) agnostic of input format -y allows overwriting output processed_path
        "-ac", "1", "-ar", "16000", "-f", "wav", processed_path # (output)
        # -ac 1 : mono channel, -ar 16000 : 16kHz sample rate, -f wav : wav format
    ], check=True)

    # this is wrapped in a try catch because whisper will throw an error if it tries to process an empty segment
    # there are obviously a lot of those in real world files, i want a clean log please and thank you
    try:
        result = model.transcribe(
            processed_path,
            language="en",
            temperature=0.2,
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

    # only slice if filename is long enough
    if len(audio.filename) > 4:
        jsondumpname = audio.filename[:4]
    else:
        jsondumpname = audio.filename

    # write out the transcript json file so that we can debug later ykyk
    with open(f"runlogs/{jsondumpname}_{datetime.now()}.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Transcription complete:", result["text"]) # for debugging (log to the terminal)
    
    txt_path = audio_path.rsplit(".", 1)[0] + ".txt"
    with open(txt_path, "w") as out:
        out.write(result["text"])

    print("audio path:", audio_path, "processed path:", processed_path, "txt path:", txt_path) # more debugging

    # exit by returning just the text and the text download path because thats all the frontend needs
    return jsonify({
        "transcription": result["text"],
        "download_url": f"http://127.0.0.1:5000/download/{os.path.basename(txt_path)}"
    })

# backend route to download the transcription file download ( include in window )
@app.route("/download/<filename>")
def download(filename):
    # Keep encoding consistent with how file was saved
    encoded_name = urllib.parse.quote(os.path.basename(filename), safe="%")
    path = os.path.join("/tmp", encoded_name)

    return send_file(path, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
    # try using host="0.0.0.0"