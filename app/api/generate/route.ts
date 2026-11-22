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

function clean(value: unknown, fallback = "") {
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

const templateLines = originalTemplate.split("\n\n");
const numberedTemplate = templateLines.map((line, index) => `${index + 1}. ${line}`).join("\n");

const paragraphRoles: Record<number, { field: string; instruction: string }> = {
  2: {
    field: "excusesRebuke",
    instruction: "준 핑계를 빠짐없이 자연스러운 명사구로 바꾸고 각 항목에 ‘탓’을 붙인다. 예: ‘조작실이 어두움’은 ‘어두운 조작실 탓’. 메모의 ‘…함’이나 ‘…있음’에 바로 붙이지 않는다. 빈칸이면 ‘이제 와서 핑계 대지 마라.’",
  },
  3: {
    field: "waited",
    instruction: "화자가 상대를 충분히 기다려 줬다고 말한다. target이 사람 이름이면 문장 맨 앞에서만 ‘재현아’, ‘성우야’처럼 부르고 쉼표 뒤에 기다린 화자를 쓴다. 친근형 ‘서연이’는 ‘서연아’, 실제 이름 ‘다이’는 ‘다이야’다. ‘솔이’처럼 모호하거나 ‘신입’, ‘첫 주자’처럼 역할만 있으면 호칭 없이 ‘나도 너를 충분히 기다려 줬다’처럼 쓴다. 이후에는 ‘너’, ‘네가’, ‘네’를 쓰고 이름에서 성별이나 관계를 추정하지 않는다.",
  },
  4: {
    field: "speakerPast",
    instruction: "화자가 예전에 겪은 어려움과 그때 받지 못했던 도움을 자기 입장에서 회상한다. 추상적인 말이 겹치면 상황에 어울리는 경험 하나로 좁힌다.",
  },
  5: {
    field: "resolve",
    instruction: "‘그래서’로 시작해 상대를 맡거나 처음 만났을 때의 다짐을 말한다.",
  },
  6: {
    field: "bestEffort",
    instruction: "최고가 아니더라도 최선을 다해 주고 싶었다는 고백이다.",
  },
  7: {
    field: "concreteHelp",
    instruction: "patience에 화자가 이미 해 준 일이 있으면 항목과 횟수를 살린다. 예: ‘설명서를 만들고 두 번 보여 줬다.’ 그렇지 않으면 ‘네 책상 옆에 앉아 과제 순서를 같이 짜 주고 싶었다’처럼 화자가 직접 해 주고 싶었던 행동을 상황에 맞춰 말한다.",
  },
  8: {
    field: "recurringBehavior",
    instruction: "patience에서 상대가 반복한 행동을 모두 살리고 ‘앞에선 내가 … 했지만, 속으로는 …’으로 화자의 반응을 대비한다. 조건절 하나로 쓴다. ‘찍기로 해도 잊어버릴 때도’는 ‘촬영 약속을 잊을 때도’처럼 줄인다. ‘잦은 지각’은 ‘자꾸 지각하고’, ‘늦잠’은 ‘늦잠을 잘’처럼 풀어 쓴다. ‘자꾸’와 ‘자주’는 겹쳐 쓰지 않는다. 평소 행동이 없으면 기다려 준 태도와 속마음만 쓴다.",
  },
  9: {
    field: "hope",
    instruction: "‘그래도 …겠지.’로 상대가 나중에 어떤 책임을 감당하길 기대했는지 말한다. ‘사람답게’처럼 상대의 사람됨을 깎아내리는 말은 피한다.",
  },
  10: {
    field: "hopeForIndependence",
    instruction: "‘나보단 …겠지.’로 상대가 스스로 해낼 구체적인 일 하나를 기대한다. 앞서 말한 9의 기대와 다른 장면을 고르고, 화자보다 일찍 익히거나 덜 헤매길 바라는 식으로 자연스럽게 비교한다.",
  },
  13: {
    field: "incidentStatement",
    instruction: "별도의 전환어 없이 incident부터 짧게 말한다. 거친 메모체를 자연스러운 반말로 풀며 시간, 수량, 소유자, 주체를 지킨다. 수식어를 올바른 동사에 붙인다(‘면허도 없이 술을 마시고 운전’ → ‘술을 마시고 면허도 없이 운전’). 결과만 알면 ‘부러졌더라’처럼 쓰고 주체나 의도를 추측하지 않는다.",
  },
  14: {
    field: "preventiveActionQuestion",
    instruction: "‘도대체’로 시작해 사건을 막기 위한 행동 하나를 묻고 물음표로 끝낸다. finalCommand의 행동과 뜻이 달라야 한다. ‘먼저 알리고 가라’와 ‘가기 전에 한마디 못 했냐’는 같은 행동이다. 이 경우 ‘도대체 가기 전에 맡은 일이 다 끝났는지 확인도 못 했냐?’처럼 다른 준비를 묻는다. 주체가 불명확하면 ‘도대체 공용 물건을 제자리에 두는 게 그렇게 어렵냐?’처럼 평소 지킬 원칙을 묻는다.",
  },
  15: {
    field: "habitRebuke",
    instruction: "변명과 평소 습관을 ‘핑계는 대면서 왜 … 못 하냔 말이다.’처럼 대비한다. recurringBehavior에서 13·14·19와 겹치지 않는 습관 하나의 행동을 직접 말한다. 예: 지각이라면 ‘왜 약속을 못 지키냔 말이다’보다 ‘왜 제시간에 못 오냔 말이다’로 쓴다. 2의 핑계 목록은 반복하지 않는다. 다른 습관이 없으면 받은 도움을 활용하거나 평소 약속을 지키는 태도를 짚는다.",
  },
  16: {
    field: "wearyReflection",
    instruction: "자기 모습에서 지친 기색을 발견하고 느낀 감정을 한 문장으로 말한다. ‘거울 속 내 얼굴을 보니 한숨이 나오더라.’처럼 관찰과 감정을 연결한다. ‘보니 … 보였다’처럼 같은 동작을 두 번 쓰지 않는다. 사물 화자는 실제로 낡을 수 있는 부품이나 힘이 빠진 상태로 표현한다.",
  },
};

const instructions = `원문 ‘아빠도 이제 한계다’의 각 문단을 다음 입력에 맞게 바꾸는 편집 작업입니다.

<원문>
${numberedTemplate}
</원문>

출력 키에 해당하는 문단만 작성하세요. 번호는 원문에서 각 문단의 위치입니다.
${Object.entries(paragraphRoles).map(([number, { field, instruction }]) => `${field} (${number}): ${instruction}`).join("\n")}

finalCommand는 원문의 19에 들어갑니다. sentence가 완성된 대사면 그대로 쓰고, 비어 있으면 사건을 정리할 행동을 하나 요구합니다. openingCommand는 1의 ‘그냥’ 뒤에 붙는 짧은 명령으로 주의를 끕니다. partingCommand는 17의 ‘그냥... 이제’ 뒤에 붙는 한마디로, 인내에 선을 긋습니다. 1과 17은 마지막 명령을 되풀이하거나 입력에 없는 처벌을 추가하지 않습니다. 1의 한계 선언과 11·12·18은 서버가 넣습니다.

원문의 호흡을 살려 짧은 한국어 반말로 쓰세요. ‘밥을 먹다’, ‘그릇을 씻다’처럼 상황에 맞는 대상과 동사를 쓰고, 없던 사실이나 잘못을 지어내지 마세요. 비장함은 말투로 살리고 욕설, 위협, 상대의 인격에 대한 판단은 피하세요.`;

const fields = {
  finalCommand: { type: "string" },
  openingCommand: { type: "string" },
  ...Object.fromEntries(Object.values(paragraphRoles).map(({ field }) => [
    field,
    { type: "string" },
  ])),
  partingCommand: { type: "string" },
};

const commandLeadIn = /^(?:(?:그냥|이제는|이제|이젠|당장)(?:[,.…\s]+|$))+/;

function commandCore(line: string) {
  return line.replace(commandLeadIn, "").replace(/[.!?…]+$/, "").trim();
}

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

  const situation = {
    actor: clean(body.actor, "아빠"),
    target: clean(body.target, "너"),
    excuses: clean(body.excuses).replace(/[,\s]+$/, ""),
    patience: clean(body.patience),
    incident: clean(body.incident),
    sentence: clean(body.sentence),
  };

  const { actor, target, ...details } = situation;
  if (actor === "아빠" && target === "너" && Object.values(details).every(detail => !detail)) {
    return NextResponse.json({ text: originalTemplate });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
  const isGpt54 = /^gpt-5\.4(?:$|-\d)/.test(model);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      ...(isGpt54 ? { reasoning: { effort: "none" } } : {}),
      instructions,
      input: JSON.stringify(situation),
      text: {
        format: {
          type: "json_schema",
          name: "parody",
          strict: true,
          schema: {
            type: "object",
            properties: fields,
            required: Object.keys(fields),
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: isGpt54 ? 3600 : 2400,
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "OpenAI API 호출에 실패했습니다." },
      { status: response.status },
    );
  }

  try {
    const parts = JSON.parse(extractOutputText(data));
    if (parts && Object.keys(fields).every(key => typeof parts[key] === "string" && parts[key].trim())) {
      const parting = clean(parts.partingCommand).replace(commandLeadIn, "");
      const fatigue = `이 ${situation.actor}도 지쳤다.`;
      const finalCommands = clean(parts.finalCommand).split(/(?<=[.!?])\s+/).map(commandCore);
      const partingCore = commandCore(parting);
      const repeatsEnding = finalCommands.includes(partingCore) || partingCore === commandCore(fatigue);
      const closingLine = partingCore && !repeatsEnding ? parting : "여기까지다.";
      const declaration = `${situation.actor}도 이제 한계다`;
      let opening = clean(parts.openingCommand).replace(/^그냥\s+/, "");
      while (opening.startsWith(declaration)) {
        opening = opening.slice(declaration.length).replace(/^[.!?…\s]+/, "").replace(/^그냥\s+/, "");
      }
      const openingCore = commandCore(opening);
      const targetNames = ["", "아", "야", "님"].map(suffix => `${situation.target}${suffix}`);
      const openingLine = !openingCore || opening.includes("이제 한계다") || opening.endsWith(",") || targetNames.includes(openingCore)
        ? "잘 들어라."
        : opening;
      const text = templateLines.map((line, index) => {
        const position = index + 1;
        if (position === 1) return `${declaration}. 그냥 ${openingLine}`;
        if (position === 17) return `그냥... 이제 ${closingLine}`;
        if (position === 18) return fatigue;
        if (position === 19) return clean(parts.finalCommand);
        const role = paragraphRoles[position];
        if (!role) return line;
        const rewritten = clean(parts[role.field]);
        if (position === 13) return rewritten.replace(/^그런데 이게 뭐냐\?\s*/, "") || line;
        return rewritten;
      }).join("\n\n");
      return NextResponse.json({ text });
    }
  } catch {
    // A refusal or a truncated response may have no complete JSON document.
  }

  return NextResponse.json({ error: "글을 끝까지 완성하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
}
