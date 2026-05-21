import { NextResponse } from "next/server";

type GenerateRequest = {
  actor?: string;
  target?: string;
  excuses?: string;
  patience?: string;
  incident?: string;
  sentence?: string;
};

type ResponseContent = {
  text?: string;
};

type ResponseOutput = {
  content?: ResponseContent[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutput[];
  error?: {
    message?: string;
  };
};

function clean(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const next = value.trim().replace(/\s+/g, " ");
  return next || fallback;
}

function extractOutputText(data: OpenAIResponse) {
  if (data.output_text) return data.output_text.trim();

  const content = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter((text): text is string => Boolean(text));

  return content?.join("\n").trim() ?? "";
}

const originalTemplate = `아빠도 이제 한계다. 그냥 나가 살아라.

유전자 탓, 사회 탓, 환경 탓하지 마라.

아빠, 엄마도 충분히 기다려 줬다.

네 엄마나 나나 어려운 환경에서 컸고, 먹고살기만 해도 바쁘고 힘든 시절이라 사랑을 많이 못 받고 자랐다.

그래서 결혼할 때 우리 자식만은 행복하게 키우자고 약속했다.

네게 최고는 아니더라도 최선을 다해주고 싶었다.

내 욕심 참으며 네 옷, 먹는 것, 교육 모두 누리게 해 주고 싶었다.

네가 철없이 굴 때도 앞에선 혼냈지만, 뒤에서는 우리가 못해줘서 그런가 보다 하며 네 어미랑 많이 울었다.

그래도 자식은 나보다 나은 삶을 살겠지.

나보단 선택의 자유를 누릴 수 있겠지.

이 생각만 하며 꾹 참으며 세월을 보냈다.

그런데 이게 뭐냐?

네 나이가 몇인지 알긴 하냐?

도대체 그 나이에 혼자서 할 줄 아는 게 뭐냐?

늘 불만은 많으면서 실천하는 게 뭐냔 말이다.

거울을 보니 늙은 내 모습에 눈물이 나더라.

그냥... 이제 나가라.

이 아빠도 지쳤다.

당장 짐 싸라.`;

const paragraphRoles = `문단별 역할:
1. 한계 선언과 첫 최종 선고. 반드시 "${"${actor}"}도 이제 한계다." 형태로 시작한다.
2. 탓하지 말라는 경고. excuses 입력값을 반영한다.
3. 충분히 기다려준 주체 선언. actor에 맞는 주변 주체를 자연스럽게 각색한다.
4. 기다려준 주체들의 배경/사정 설명.
5. 처음에 가졌던 선의의 약속 또는 목표.
6. 최고는 아니어도 최선을 다하려 했다는 문장.
7. patience 입력값을 반영해 구체적으로 챙겨준 것들.
8. target이 문제를 일으켰을 때도 감싸고 참았던 서사.
9. 그래도 더 나아질 것이라는 기대.
10. 더 많은 선택지나 자유를 누릴 것이라는 기대.
11. 그 생각으로 참고 버틴 시간.
12. "그런데 이게 뭐냐?"에 해당하는 배신감 전환.
13. 현실을 직시하게 하는 질문.
14. 혼자서 할 줄 아는 것이 무엇이냐는 압박.
15. 불만과 실천 부족을 지적하는 문장.
16. actor가 지친 모습을 자각하는 문장.
17. sentence 입력값을 반영한 최종 퇴장/정리 선고.
18. 반드시 "이 ${"${actor}"}도 지쳤다." 형태를 유지한다.
19. sentence 입력값을 반영한 짧은 마지막 명령.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  let body: GenerateRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const actor = clean(body.actor, "아빠");
  const target = clean(body.target, "너");
  const excuses = clean(body.excuses, "상황 탓, 분위기 탓, 남 탓");
  const patience = clean(body.patience, "기다릴 만큼 기다려준 것들");
  const incident = clean(body.incident, "결정타 사건");
  const sentence = clean(body.sentence, "이제 그만해라");

  const prompt = `너는 아래 원본 템플릿을 사용자의 상황에 맞게 패러디 치환한다.
새 글을 창작하지 말고, 원본 템플릿의 문단 구조와 전개 순서를 유지한 채 내용만 자연스럽게 각색해라.

사용자 입력값:
- actor: ${actor}
- target: ${target}
- excuses: ${excuses}
- patience: ${patience}
- incident: ${incident}
- sentence: ${sentence}

원본 템플릿:
${originalTemplate}

${paragraphRoles.replaceAll("${actor}", actor)}

치환 규칙:
- "아빠" 역할은 actor 입력값에 맞게 바꾼다.
- "네", "자식" 등 수신자 표현은 target 입력값에 맞게 바꾼다.
- "유전자 탓, 사회 탓, 환경 탓" 문단은 excuses 입력값으로 바꾼다.
- 참고 기다려준 서사에는 patience 입력값을 자연스럽게 반영한다.
- 배신감/현실 직시 구간에는 incident 입력값을 자연스럽게 반영한다.
- 최종 선고와 마지막 명령에는 sentence 입력값을 자연스럽게 반영한다.

절대 규칙:
- 원본보다 문단을 추가하지 마라.
- 원본보다 문단을 삭제하지 마라.
- 문단 순서를 바꾸지 마라.
- 각 문단의 기능을 유지해라.
- 한계 선언 → 탓하지 말라는 경고 → 참고 기다려준 서사 → 기대 → 배신감 → 현실 직시 → 최종 선고 흐름을 유지해라.
- 첫 문장은 반드시 "${actor}도 이제 한계다." 형태로 시작해라.
- 마지막 근처 문장은 반드시 "이 ${actor}도 지쳤다." 형태를 유지해라.
- 결과는 본문 텍스트만 출력해라.
- 해설, 제목, 마크다운, 따옴표, 목록을 출력하지 마라.
- 욕설, 혐오표현, 신상공격은 피하고 실존 인물 비방처럼 보이지 않는 유머/패러디 톤을 유지해라.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      instructions:
        "너는 '아빠도 이제 한계다' 밈 템플릿을 패러디 치환하는 편집자다. 자유 창작 작가가 아니다. 원본 템플릿의 문단 개수, 문단 순서, 문장 흐름, 감정선을 절대 변형하지 마라. 사용자가 입력한 상황에 맞게 각 문단의 내용만 치환하거나 자연스럽게 각색해라. 첫 문장은 반드시 '[actor]도 이제 한계다.' 형태로 시작하고, 마지막 근처에는 반드시 '이 [actor]도 지쳤다.' 형태의 문장을 유지해라. 원본보다 문단을 추가하거나 삭제하지 마라. 결과 본문만 출력하고 해설, 제목, 마크다운, 따옴표, 목록은 쓰지 마라. 욕설, 혐오표현, 신상공격은 피하고, 실존 인물 비방처럼 보이지 않는 허구적 유머/패러디 톤을 유지해라.",
      input: prompt,
      max_output_tokens: 1200,
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "OpenAI API 호출에 실패했습니다." },
      { status: response.status },
    );
  }

  const text = extractOutputText(data);

  if (!text) {
    return NextResponse.json({ error: "생성된 문장을 읽을 수 없습니다." }, { status: 502 });
  }

  return NextResponse.json({ text });
}
