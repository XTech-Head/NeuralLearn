"use client";
import React, { useState, useRef } from "react";
import {
  Sparkles, Loader2, BookOpen, Clock, BarChart2,
  GraduationCap, Mic, Square,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import MyCourses from "./MyCourses";

const EXAMPLES = [
  "Python Basics", "Web Development", "Data Science",
  "Machine Learning", "React & Next.js", "System Design",
];

type Tab = "generate" | "my-courses";
type GenerationStep = "idle" | "outline" | "saving" | "enriching";
type MicState = "idle" | "recording" | "transcribing";

function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async (): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = [
        "audio/webm;codecs=opus", "audio/webm",
        "audio/ogg;codecs=opus", "audio/mp4",
      ].find(m => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      return { ok: true };
    } catch (error: any) {
      console.error("Microphone access error:", error);
      const reason = error?.name && error?.message
        ? `${error.name}: ${error.message}`
        : "Unknown microphone error";
      return { ok: false, reason };
    }
  };

  const stop = (): Promise<Blob> => new Promise((resolve) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) { resolve(new Blob()); return; }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      streamRef.current?.getTracks().forEach(t => t.stop());
      resolve(blob);
    };
    recorder.stop();
  });

  return { start, stop };
}

function WaveformBars() {
  return (
    <div className="flex gap-0.5 items-end h-4">
      {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9].map((h, i) => (
        <div key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 80}ms`, animationDuration: `${500 + i * 80}ms` }} />
      ))}
    </div>
  );
}

export default function CourseGenerator() {
  const [tab, setTab] = useState<Tab>("generate");
  const [topic, setTopic] = useState("");
  const [step, setStep] = useState<GenerationStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micState, setMicState] = useState<MicState>("idle");
  const recorder = useAudioRecorder();
  const { isSignedIn } = useUser();
  const router = useRouter();

  const isGenerating = step !== "idle";
  const isRecording = micState === "recording";
  const isTranscribing = micState === "transcribing";
  const micBusy = isRecording || isTranscribing;

  const handleMicClick = async () => {
    if (isGenerating) return;
    if (isRecording) {
      setMicState("transcribing");
      const audioBlob = await recorder.stop();
      if (audioBlob.size < 1000) { setMicState("idle"); setError("Recording too short, please try again."); return; }
      try {
        const form = new FormData();
        form.append("audio", audioBlob);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.text) { setTopic(prev => prev ? `${prev} ${data.text}` : data.text); setError(null); }
        else setError("Could not detect speech. Please try again.");
      } catch { setError("Something went wrong. Please try again."); }
      finally { setMicState("idle"); }
    } else {
      setError(null);
      const result = await recorder.start();
      if (result.ok) {
        setMicState("recording");
      } else {
        setError(`Microphone access failed: ${result.reason}. Please allow the mic in this browser/site settings.`);
      }
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || isGenerating) return;
    if (isRecording) { await recorder.stop(); setMicState("idle"); }
    if (!isSignedIn) { router.push("/sign-up"); return; }
    setError(null);
    setStep("outline");
    try {
      setStep("saving");
      const res = await fetch("/api/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Generation failed"); }
      const data = await res.json();
      setStep("enriching");
      router.push(`/course/${data.courseId}`);
    } catch (err: any) { setError(err.message ?? "Something went wrong. Please try again."); setStep("idle"); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isGenerating) handleGenerate();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">

      {/* Tab switcher */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center bg-muted/50 border border-border rounded-2xl p-1 gap-1">
          {([["generate", Sparkles, "Generate"], ["my-courses", GraduationCap, "My Courses"]] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t as Tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === t ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {tab === "generate" && (
        <div className="space-y-8">

          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Generate Your AI Course</h1>
            <p className="text-lg text-muted-foreground">
              Enter any topic and let AI craft a full video course — chapters, lessons, and quizzes included.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center max-w-2xl mx-auto">
            {[
              { icon: BookOpen, label: "6–8 Chapters", sub: "with full lessons" },
              { icon: BarChart2, label: "Quiz per chapter", sub: "4 questions each" },
              { icon: Clock, label: "Video per chapter", sub: "curated from YouTube" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-xl border border-border bg-card/50 p-3 space-y-1">
                <Icon className="w-5 h-5 mx-auto text-purple-500" />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="relative group max-w-2xl mx-auto">
            <div className={`absolute -inset-0.5 rounded-2xl blur transition-all duration-300 ${
              isRecording
                ? "bg-linear-to-r from-red-500 to-pink-500 opacity-60"
                : "bg-linear-to-r from-purple-600 to-pink-600 opacity-30 group-hover:opacity-60"
            }`} />

            <div className="relative bg-card rounded-2xl border border-border p-2 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isRecording ? "Listening…" :
                      isTranscribing ? "Processing…" :
                      "e.g., Introduction to Machine Learning..."
                    }
                    className={`w-full pl-4 pr-12 py-3 bg-background rounded-xl border-0 outline-none text-base text-foreground transition-colors ${
                      isRecording ? "placeholder:text-red-400/60" :
                      isTranscribing ? "placeholder:text-purple-400/60" :
                      "placeholder:text-muted-foreground"
                    }`}
                    disabled={isGenerating || isTranscribing}
                    maxLength={200}
                  />
                
                
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim() || micBusy}
                  className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-40"
                >
                  {isGenerating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Sparkles className="w-4 h-4" />Generate Course</>}
                </button>
              </div>

              {/* Recording waveform — no text labels */}
              {isRecording && (
                <div className="px-2 pb-1 flex items-center justify-center">
                  <WaveformBars />
                </div>
              )}

              {/* Transcribing — just a centered spinner */}
              {isTranscribing && (
                <div className="px-2 pb-1 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
              )}

              {/* Generation progress — just the bar, no text */}
              {isGenerating && (
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                    style={{ width: step === "outline" ? "30%" : step === "saving" ? "60%" : "85%" }} />
                </div>
              )}
            </div>
          </div>

          {/* Error — generic, no internal details */}
          {error && (
            <div className="max-w-2xl mx-auto rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center items-center">
            <span className="text-sm text-muted-foreground">Try:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => setTopic(ex)} disabled={isGenerating}
                className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-40">
                {ex}
              </button>
            ))}
          </div>

          {!isSignedIn && (
            <p className="text-center text-sm text-muted-foreground">
              <a href="/sign-up" className="text-purple-400 hover:underline font-medium">Sign up free</a>{" "}
              to generate your first course — 100 credits included.
            </p>
          )}

          {isSignedIn && (
            <p className="text-center text-sm text-muted-foreground">
              Already have courses?{" "}
              <button onClick={() => setTab("my-courses")} className="text-purple-400 hover:underline font-medium">
                View My Courses →
              </button>
            </p>
          )}
        </div>
      )}

      {tab === "my-courses" && <MyCourses />}
    </div>
  );
}