import subprocess
from flask import Flask, request, send_file, jsonify
from dotenv import load_dotenv
import whisper, json
from flask_cors import CORS
import os

load_dotenv()  # take environment variables from .env config file
app = Flask(__name__)
CORS(app)
model = whisper.load_model("turbo")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if not request.files:
        return jsonify({"error": "No file uploaded"}), 400

    audio = next(request.files.values())
    audio_path = f"/tmp/{audio.filename}"
    audio.save(audio_path)

    processed_path = audio_path.rsplit(".", 1)[0] + "_clean.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", audio_path,
        "-ac", "1", "-ar", "16000", "-f", "wav", processed_path
    ], check=True)

    try:
        result = model.transcribe(
            audio_path,
            language="en",
            temperature=0.0,
            word_timestamps=True
        )
    except RuntimeError as e:
        if "0 elements" in str(e):
            print("Warning: Whisper skipped an empty segment.")
        else:
            raise
    

    output = {
        "text": result["text"],
        "segments": result.get("segments", []),
        "language": result.get("language", "unknown"),
    }

    with open("transcription.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Transcription complete:", result["text"])

    txt_path = audio_path.replace(".mp3", ".txt")
    with open(txt_path, "w") as out:
        out.write(result["text"])

    return jsonify({
        "transcription": result["text"],
        "download_url": f"http://127.0.0.1:5000/download/{os.path.basename(txt_path)}"
    })


@app.route("/download/<filename>")
def download(filename):
    return send_file(f"/tmp/{filename}", as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)