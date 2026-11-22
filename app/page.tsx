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

type IconName = "spark" | "file" | "copy" | "download" | "share" | "refresh" | "check";

const initialForm: FormState = {
  customActor: "",
  target: "",
  excuses: "",
  patience: "",
  incident: "",
  sentence: "",
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    spark: <path d="m12 2 1.8 5.6L19.5 9l-5.7 1.7L12 16.5l-1.8-5.8L4.5 9l5.7-1.4L12 2ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />,
    file: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 15.5h6" /></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></>,
    download: <><path d="M12 3v11m-4-4 4 4 4-4" /><path d="M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
    share: <><path d="M12 15V3m-4 4 4-4 4 4" /><path d="M5 13.5v5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-5" /></>,
    refresh: <><path d="M19 8a7.5 7.5 0 0 0-12.8-1L4 9.5M5 16a7.5 7.5 0 0 0 12.8 1l2.2-2.5" /><path d="M4 5v4.5h4.5M20 19v-4.5h-4.5" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function EmptyIllustration() {
  return (
    <svg className="empty-illustration" viewBox="0 0 210 164" fill="none" aria-hidden="true">
      <path d="M31 42 20 37m14-8-5-9m142 15 11-7m-4 25 13 1M35 130l-10 7m144-7 10 7" stroke="#D5D6CF" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="51" y="21" width="104" height="126" rx="9" fill="#E7E8E1" transform="rotate(-7 51 21)" />
      <rect x="59" y="16" width="104" height="126" rx="9" fill="white" stroke="#D7D9D1" strokeWidth="2" transform="rotate(4 59 16)" />
      <path d="m78 47 59 4M77 60l42 3M76 73l51 4" stroke="#D9DAD4" strokeWidth="5" strokeLinecap="round" />
      <circle cx="142" cy="105" r="28" fill="#F05A42" />
      <path d="M132 99h.1m19.8 0h.1M133 112c3-5 15-5 18 0" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m118 128-6 9 13-5" fill="#F05A42" />
      <path d="m43 77-7 2m8 7-5 5m125-65 4-7" stroke="#F05A42" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function compact(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to selection-based copying when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export default function Home() {
  const [actor, setActor] = useState("아빠");
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const resultRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function generateMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;
    setIsGenerating(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: actor === "직접 입력" ? compact(form.customActor, "누군가") : actor,
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
    try {
      setNotice(await copyText(result) ? "문구를 복사했어요." : "복사하지 못했어요. 문구를 직접 선택해 복사해 주세요.");
    } catch {
      setNotice("복사하지 못했어요. 문구를 직접 선택해 복사해 주세요.");
    }
  }

  async function downloadImage() {
    if (!result) return;
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      setNotice("이미지를 만들지 못했어요. 다시 시도해 주세요.");
      return;
    }

    const width = 1080;
    const padding = 84;
    const maxTextWidth = width - padding * 2;
    const lineHeight = 48;
    context.font = "500 29px Arial, sans-serif";

    const textLines = result.split("\n").flatMap((paragraph) => {
      if (!paragraph) return [""];
      const lines: string[] = [];
      let currentLine = "";
      paragraph.split(" ").forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (context.measureText(nextLine).width <= maxTextWidth) {
          currentLine = nextLine;
        } else {
          if (currentLine) lines.push(currentLine);
          if (context.measureText(word).width <= maxTextWidth) {
            currentLine = word;
          } else {
            let chunk = "";
            [...word].forEach((char) => {
              if (context.measureText(chunk + char).width > maxTextWidth && chunk) {
                lines.push(chunk);
                chunk = char;
              } else {
                chunk += char;
              }
            });
            currentLine = chunk;
          }
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    });

    const height = Math.max(1080, 260 + textLines.length * lineHeight + padding);
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#f5f5f1";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f05a42";
    context.fillRect(0, 0, width, 15);
    context.fillStyle = "#f05a42";
    context.font = "700 22px Arial, sans-serif";
    context.fillText("아빠도 이제 한계다", padding, 93);
    context.fillStyle = "#242622";
    context.font = "700 42px Arial, sans-serif";
    context.fillText("나의 최후통첩", padding, 156);
    context.strokeStyle = "#d9dad5";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(padding, 190);
    context.lineTo(width - padding, 190);
    context.stroke();
    context.fillStyle = "#343631";
    context.font = "500 29px Arial, sans-serif";
    textLines.forEach((line, index) => context.fillText(line, padding, 250 + index * lineHeight));

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setNotice("이미지를 만들지 못했어요. 다시 시도해 주세요.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "appa-hangye-ultimatum.jpg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("이미지를 저장했어요.");
  }

  async function shareResult() {
    if (!result) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "아빠도 이제 한계다 생성기", text: result });
      } else {
        setNotice(await copyText(result) ? "공유할 문구를 복사했어요." : "공유할 문구를 복사하지 못했어요.");
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setNotice("공유하지 못했어요. 다시 시도해 주세요.");
    }
  }

  function resetResult() {
    setResult("");
    setError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="아빠도 이제 한계다 홈">
            <span className="brand-mark" aria-hidden="true">!</span>
            <span className="brand-name">아빠도 이제 한계다<span>속마음 대필소</span></span>
          </a>
          <div className="header-note"><span className="header-note-icon" aria-hidden="true">✳</span> 참았던 말, 대신 전해드려요</div>
        </div>
      </header>

      <main id="top" className="page-content">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> 세상의 모든 한계를 위해</div>
            <h1 id="page-title">참을 만큼 참으셨다면,<br /><span>이제는 말할 차례예요.</span></h1>
            <p>차마 못 했던 말, 마음속에 쌓아두지만 마세요.<br className="desktop-break" /> 여러분의 상황을 담아 속 시원한 최후통첩을 만들어 드릴게요.</p>
          </div>
          <div className="hero-graphic" aria-hidden="true">
            <div className="graphic-label">마음의 소리 듣는 중 <span>✳</span></div>
            <div className="speech speech-back">휴...</div>
            <div className="speech speech-front"><span>이제</span><strong>한계다!</strong></div>
            <div className="graphic-spark spark-one">✳</div>
            <div className="graphic-spark spark-two">✦</div>
          </div>
        </section>

        <div className="workspace">
          <form className="editor panel" onSubmit={generateMessage} ref={formRef}>
            <div className="panel-heading editor-heading">
              <div>
                <p className="section-kicker">LET IT OUT</p>
                <h2>어떤 상황인가요?</h2>
                <p className="section-description">상황을 알려주시면 마음을 담아 적어드릴게요.</p>
              </div>
              <span className="heading-icon" aria-hidden="true"><Icon name="spark" size={23} /></span>
            </div>

            <div className="editor-body">
              <fieldset className="field actor-field">
                <legend>누가 한계인가요?</legend>
                <p className="field-hint">마음을 대신 전할 사람을 골라주세요.</p>
                <div className="actor-options">
                  {actors.map((item) => (
                    <label className={`actor-option ${actor === item ? "is-selected" : ""}`} key={item}>
                      <input type="radio" name="actor" value={item} checked={actor === item} onChange={() => setActor(item)} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
                {actor === "직접 입력" && (
                  <input className="custom-actor" aria-label="한계인 사람 직접 입력" value={form.customActor} onChange={(event) => updateField("customActor", event.target.value)} placeholder="예: 사수, 대표, 선배" maxLength={100} />
                )}
              </fieldset>

              <div className="field-grid">
                <label className="field">
                  <span className="field-label">누구에게 말하나요?</span>
                  <input value={form.target} onChange={(event) => updateField("target", event.target.value)} placeholder="예: 아들, 신입, 학생" maxLength={100} />
                </label>
                <label className="field">
                  <span className="field-label">탓하지 말아야 할 것들</span>
                  <input value={form.excuses} onChange={(event) => updateField("excuses", event.target.value)} placeholder="예: 환경 탓, 날씨 탓" maxLength={220} />
                </label>
                <label className="field">
                  <span className="field-label">참고 기다려준 것들</span>
                  <textarea value={form.patience} onChange={(event) => updateField("patience", event.target.value)} placeholder="예: 매번 늦는 마감, 끝없는 수정" rows={3} maxLength={240} />
                </label>
                <label className="field">
                  <span className="field-label">어떤 일로 한계에 다다르셨나요?</span>
                  <textarea value={form.incident} onChange={(event) => updateField("incident", event.target.value)} placeholder="예: 퇴근 5분 전에 오늘까지 다시 고쳐 달라고 했어요" rows={3} maxLength={260} />
                </label>
                <label className="field field-wide">
                  <span className="field-label">마지막으로 하고 싶은 말</span>
                  <input value={form.sentence} onChange={(event) => updateField("sentence", event.target.value)} placeholder="예: 이제 그만해라 / 당장 짐 싸라" maxLength={120} />
                </label>
              </div>

              <div className="submit-area">
                <button className="generate-button" type="submit" disabled={isGenerating}>
                  <Icon name="spark" size={20} />
                  {isGenerating ? "최후통첩을 작성하고 있어요" : "최후통첩 만들기"}
                </button>
                <p className="submit-hint">빈칸은 편하게 두셔도 괜찮아요.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
              </div>
            </div>
          </form>

          <section className={`preview-column ${result ? "has-result" : ""}`} ref={resultRef} aria-labelledby="result-title">
            <div className="preview panel">
              <div className="panel-heading preview-heading">
                <div>
                  <p className="section-kicker">YOUR MESSAGE</p>
                  <h2 id="result-title">나의 최후통첩</h2>
                  <p className="section-description">참아왔던 마음을 한 편의 글로.</p>
                </div>
                <span className="preview-icon" aria-hidden="true"><Icon name="file" size={22} /></span>
              </div>
              <div className="preview-body" aria-busy={isGenerating}>
                <div className="paper">
                  <div className="paper-topline">
                    <span>마음을 담아,</span>
                    <span className={`paper-status ${result ? "is-complete" : ""}`}>{isGenerating ? "작성 중" : result ? "작성 완료" : "작성 대기"}</span>
                  </div>
                  {result ? (
                    <div className="result-content" aria-live="polite">
                      <h3>최후통첩문</h3>
                      <pre>{result}</pre>
                      <div className="paper-signature">이제 한계다 <span>!</span></div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <EmptyIllustration />
                      <h3>{isGenerating ? "마음을 꾹꾹 담고 있어요" : "아직은 평화롭네요."}</h3>
                      <p>{isGenerating ? "잠시만 기다려 주세요." : <>상황을 적고 버튼을 누르면<br />여기에 최후통첩이 도착해요.</>}</p>
                    </div>
                  )}
                  <div className="paper-footer"><span>FROM. 마음이 지친 누군가</span><span>♥</span></div>
                </div>
                <div className="result-actions" aria-label="결과 도구">
                  <button className="copy-button" type="button" onClick={copyResult} disabled={!result || isGenerating}><Icon name="copy" size={18} /> 복사하기</button>
                  <button type="button" onClick={downloadImage} disabled={!result || isGenerating}><Icon name="download" size={18} /> 이미지 저장</button>
                  <button type="button" onClick={shareResult} disabled={!result || isGenerating}><Icon name="share" size={18} /> 공유하기</button>
                  <button type="button" onClick={resetResult} disabled={!result || isGenerating}><Icon name="refresh" size={18} /> 다시 만들기</button>
                </div>
                <p className="action-notice" role="status">{notice || "완성된 문구를 복사하거나 이미지로 저장해 보세요."}</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="site-footer">
          <div><span className="footer-mark">!</span><strong>아빠도 이제 한계다</strong><span>마음은 가볍게, 말은 시원하게.</span></div>
          <p>웃음을 위한 밈 생성 서비스입니다.</p>
        </footer>
      </main>
    </div>
  );
}
