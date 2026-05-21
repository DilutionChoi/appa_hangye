"use client";

import { FormEvent, useRef, useState } from "react";

const actors = ["아빠", "엄마", "팀장", "PM", "교수", "코치", "ChatGPT", "직접 입력"];

type FormState = {
  customActor: string;
  target: string;
  excuses: string;
  patience: string;
  incident: string;
  sentence: string;
};

const initialForm: FormState = {
  customActor: "",
  target: "",
  excuses: "",
  patience: "",
  incident: "",
  sentence: "",
};

function compact(value: string, fallback: string) {
  const next = value.trim().replace(/\s+/g, " ");
  return next || fallback;
}

function actorName(actor: string, customActor: string) {
  if (actor === "직접 입력") {
    return compact(customActor, "누군가");
  }

  return actor;
}

export default function Home() {
  const [actor, setActor] = useState("아빠");
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState("");
  const [copyLabel, setCopyLabel] = useState("복사하기");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLElement>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectActor(value: string) {
    setActor(value);
  }

  async function generateMessage(event?: FormEvent) {
    event?.preventDefault();
    setIsGenerating(true);
    setError("");
    setCopyLabel("복사하기");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: actorName(actor, form.customActor),
          target: form.target,
          excuses: form.excuses,
          patience: form.patience,
          incident: form.incident,
          sentence: form.sentence,
        }),
      });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.error ?? "최후통첩문 생성에 실패했습니다.");
      }

      setResult(data.text);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "최후통첩문 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyResult() {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopyLabel("복사 완료");
    window.setTimeout(() => setCopyLabel("복사하기"), 1400);
  }

  async function downloadImage() {
    if (!result) return;

    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return;

    const width = 1080;
    const padding = 64;
    const maxTextWidth = width - padding * 2;
    const lineHeight = 36;

    context.font = "600 28px Arial, sans-serif";

    const textLines = result.split("\n").flatMap((paragraph) => {
      if (!paragraph) return [""];

      const words = paragraph.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;

        if (context.measureText(nextLine).width <= maxTextWidth) {
          currentLine = nextLine;
          return;
        }

        if (currentLine) lines.push(currentLine);

        if (context.measureText(word).width <= maxTextWidth) {
          currentLine = word;
          return;
        }

        let chunk = "";
        [...word].forEach((char) => {
          const nextChunk = `${chunk}${char}`;

          if (context.measureText(nextChunk).width <= maxTextWidth) {
            chunk = nextChunk;
          } else {
            lines.push(chunk);
            chunk = char;
          }
        });
        currentLine = chunk;
      });

      if (currentLine) lines.push(currentLine);
      return lines;
    });
    const height = Math.max(1350, 190 + textLines.length * lineHeight + padding);

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = "#efe1b8";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "#8f2f22";
    context.lineWidth = 4;
    context.setLineDash([14, 10]);
    context.strokeRect(34, 34, width - 68, height - 68);
    context.setLineDash([]);

    context.fillStyle = "rgba(87, 58, 24, 0.055)";
    for (let y = 0; y < height; y += 34) {
      context.fillRect(0, y, width, 1);
    }

    context.fillStyle = "#15120d";
    context.font = "700 34px Arial, sans-serif";
    context.fillText("최후통첩문", padding, 96);

    context.save();
    context.translate(774, 104);
    context.rotate((-5 * Math.PI) / 180);
    context.strokeStyle = "#9f2419";
    context.lineWidth = 3;
    context.strokeRect(-18, -42, 218, 58);
    context.fillStyle = "#9f2419";
    context.font = "900 34px Arial, sans-serif";
    context.fillText("인내심 종료", 0, 0);
    context.restore();

    context.fillStyle = "#15120d";
    context.font = "600 28px Arial, sans-serif";
    textLines.forEach((line, index) => {
      context.fillText(line, padding, 172 + index * lineHeight);
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appa-hangye-ultimatum.jpg";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareResult() {
    if (!result) return;

    if (navigator.share) {
      await navigator.share({ title: "아빠도 이제 한계다 생성기", text: result });
      return;
    }

    await navigator.clipboard.writeText(result);
    setCopyLabel("공유문 복사됨");
    window.setTimeout(() => setCopyLabel("복사하기"), 1400);
  }

  function resetResult() {
    setResult("");
    setCopyLabel("복사하기");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--paper)] sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-7">
        <header className="site-header">
          <div className="title-row">
            <h1>아빠도 이제 한계다 생성기</h1>
            <span className="stamp stamp-large">한계 도달</span>
          </div>
          <p className="subtitle">참고 참던 누군가의 마지막 장문을 생성합니다.</p>
        </header>

        <form className="input-card" onSubmit={generateMessage}>
          <div className="card-title">
            <span className="clipboard-icon" aria-hidden="true" />
            <h2>최후통첩 정보 입력</h2>
          </div>

          <fieldset className="form-row actor-row">
            <legend>
              <span>1</span>누가 한계인가요?
            </legend>
            <div className="segmented" role="radiogroup" aria-label="누가 한계인가요?">
              {actors.map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={actor === item}
                  className={actor === item ? "selected" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectActor(item);
                  }}
                  onTouchEnd={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectActor(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {actor === "직접 입력" ? (
              <input
                aria-label="직접 입력"
                value={form.customActor}
                onChange={(event) => updateField("customActor", event.target.value)}
                placeholder="예: 사수, 대표, 선배"
              />
            ) : null}
          </fieldset>

          <label className="form-row">
            <span className="label-text">
              <b>2</b>누구에게 말하나요?
            </span>
            <input
              value={form.target}
              onChange={(event) => updateField("target", event.target.value)}
              placeholder="예: 아들, 신입, 통역, 학생, 회원, 사용자"
              maxLength={100}
            />
          </label>

          <label className="form-row">
            <span className="label-text">
              <b>3</b>탓하지 말아야 할 것들
            </span>
            <textarea
              value={form.excuses}
              onChange={(event) => updateField("excuses", event.target.value)}
              placeholder="예: 유전자 탓, 현장 소음 탓, 날씨 탓"
              rows={2}
              maxLength={220}
            />
          </label>

          <label className="form-row">
            <span className="label-text">
              <b>4</b>참고 기다려준 것들
            </span>
            <textarea
              value={form.patience}
              onChange={(event) => updateField("patience", event.target.value)}
              placeholder="예: 업무 미숙, 거짓말, 월급 가불"
              rows={2}
              maxLength={240}
            />
          </label>

          <label className="form-row">
            <span className="label-text">
              <b>5</b>결정타 사건
            </span>
            <textarea
              value={form.incident}
              onChange={(event) => updateField("incident", event.target.value)}
              placeholder="예: 작업 계획서 번역을 엉망으로 해와서 본사에 깨질 상황이 됨"
              rows={2}
              maxLength={260}
            />
          </label>

          <label className="form-row">
            <span className="label-text">
              <b>6</b>마지막 선고
            </span>
            <input
              value={form.sentence}
              onChange={(event) => updateField("sentence", event.target.value)}
              placeholder="예: 그냥 한국 가라 / 짐 싸라 / 이제 나가 살아라"
              maxLength={120}
            />
          </label>

          <button className="generate-button" type="submit" disabled={isGenerating}>
            <span aria-hidden="true">!</span>
            {isGenerating ? "작성 중" : "이제 한계다"}
          </button>
          <p className="button-hint">누르면 누군가의 인내심이 끝납니다.</p>
          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <section className={`result-card ${result ? "has-result" : ""}`} ref={resultRef}>
          <div className="result-head">
            <h2>최후통첩문</h2>
            <span className="stamp">인내심 종료</span>
          </div>
          {result ? (
            <pre>{result}</pre>
          ) : (
            <div className="empty-state">
              <p>아직 아무도 한계에 도달하지 않았습니다.</p>
              <span>상황을 입력하고 ‘이제 한계다’를 눌러보세요.</span>
            </div>
          )}
        </section>

        <div className="action-bar" aria-label="결과 액션">
          <button className="primary-action" type="button" onClick={copyResult} disabled={!result}>
            {copyLabel}
          </button>
          <button type="button" onClick={downloadImage} disabled={!result}>
            이미지로 저장
          </button>
          <button type="button" onClick={resetResult} disabled={!result}>
            다시 만들기
          </button>
          <button type="button" onClick={shareResult} disabled={!result}>
            공유하기
          </button>
        </div>
      </div>
    </main>
  );
}
