// Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987).
// Options are listed in the standard display order with their standard scores
// (items 1, 2, 4 score 0→3 top-down; items 3, 5–10 are reverse-scored 3→0).

export type EpdsItem = { q: string; options: { label: string; score: number }[] };

const fwd = (labels: string[]) => labels.map((label, i) => ({ label, score: i }));
const rev = (labels: string[]) => labels.map((label, i) => ({ label, score: 3 - i }));

export const EPDS_ITEMS: EpdsItem[] = [
  {
    q: "I have been able to laugh and see the funny side of things",
    options: fwd(["As much as I always could", "Not quite so much now", "Definitely not so much now", "Not at all"]),
  },
  {
    q: "I have looked forward with enjoyment to things",
    options: fwd(["As much as I ever did", "Rather less than I used to", "Definitely less than I used to", "Hardly at all"]),
  },
  {
    q: "I have blamed myself unnecessarily when things went wrong",
    options: rev(["Yes, most of the time", "Yes, some of the time", "Not very often", "No, never"]),
  },
  {
    q: "I have been anxious or worried for no good reason",
    options: fwd(["No, not at all", "Hardly ever", "Yes, sometimes", "Yes, very often"]),
  },
  {
    q: "I have felt scared or panicky for no very good reason",
    options: rev(["Yes, quite a lot", "Yes, sometimes", "No, not much", "No, not at all"]),
  },
  {
    q: "Things have been getting on top of me",
    options: rev([
      "Yes, most of the time I haven't been able to cope at all",
      "Yes, sometimes I haven't been coping as well as usual",
      "No, most of the time I have coped quite well",
      "No, I have been coping as well as ever",
    ]),
  },
  {
    q: "I have been so unhappy that I have had difficulty sleeping",
    options: rev(["Yes, most of the time", "Yes, sometimes", "Not very often", "No, not at all"]),
  },
  {
    q: "I have felt sad or miserable",
    options: rev(["Yes, most of the time", "Yes, quite often", "Not very often", "No, not at all"]),
  },
  {
    q: "I have been so unhappy that I have been crying",
    options: rev(["Yes, most of the time", "Yes, quite often", "Only occasionally", "No, never"]),
  },
  {
    q: "The thought of harming myself has occurred to me",
    options: rev(["Yes, quite often", "Sometimes", "Hardly ever", "Never"]),
  },
];

export const EPDS_MAX = 30;

export type EpdsResult = { ts: number; total: number; answers: number[]; selfHarm: boolean };

export function scoreEpds(answers: number[]): Omit<EpdsResult, "ts"> {
  const total = answers.reduce((a, b) => a + b, 0);
  return { total, answers, selfHarm: (answers[9] ?? 0) > 0 };
}

export type EpdsBand = { key: "low" | "possible" | "likely"; label: string; advice: string };

export function epdsBand(total: number): EpdsBand {
  if (total >= 13)
    return {
      key: "likely",
      label: "Signs of postnatal depression",
      advice:
        "Your answers suggest you may be experiencing postnatal depression. This is common, treatable, and not your fault. Please talk to your doctor, midwife or health visitor soon.",
    };
  if (total >= 10)
    return {
      key: "possible",
      label: "Some signs of low mood",
      advice:
        "You may be experiencing some symptoms of depression. Keep an eye on how you feel, and consider mentioning it at your next check-up. Retake this in 2 weeks.",
    };
  return {
    key: "low",
    label: "Low risk right now",
    advice: "Your answers don't suggest depression right now. Keep checking in, as feelings can change in the months after birth.",
  };
}
