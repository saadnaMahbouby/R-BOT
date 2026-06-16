import { spawn } from "node:child_process";

// WhatsApp doesn't support animated GIFs, only MP4. We convert the GIF to an
// H.264 MP4 (no audio, even dimensions, yuv420p) so it plays like a GIF.
export const convertGifToMp4 = (gifBuffer: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f",
      "gif",
      "-i",
      "pipe:0",
      "-movflags",
      "frag_keyframe+empty_moov+faststart",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-an",
      "-f",
      "mp4",
      "pipe:1",
    ]);

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    ffmpeg.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) return resolve(Buffer.concat(stdoutChunks));
      reject(
        new Error(
          `ffmpeg exited with code ${code}: ${Buffer.concat(stderrChunks).toString()}`,
        ),
      );
    });

    ffmpeg.stdin.on("error", reject);
    ffmpeg.stdin.write(gifBuffer);
    ffmpeg.stdin.end();
  });
