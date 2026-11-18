"use client";

import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { dateKey } from "@/lib/sleep";
import { useNow } from "@/lib/client";
import { useStore, type Feeding } from "@/lib/storage";

const FEEDING = [
  { value: "breast", label: "Breastfeeding" },
  { value: "formula", label: "Formula feeding" },
  { value: "mixed", label: "Mixed feeding" },
  { value: "solids", label: "Milk and solids" },
];

export default function AboutPage() {
  const [profile, setProfile, loaded] = useStore("profile", {});
  const now = useNow();
  if (!loaded || now === null) return <div className="h-64" />;

  const firstBaby = profile.firstBaby === undefined ? "" : profile.firstBaby ? "yes" : "no";

  return (
    <section className="space-y-5">
      <PageHeader title="About you and your baby" subtitle="All optional. It helps Bloom fit its replies to you, and fills in your doctor summary." />

      <div className="space-y-5 rounded-3xl bg-card p-5 shadow-sm">
        <TextInput
          label="What should we call you?"
          value={profile.name ?? ""}
          onChange={(v) => setProfile((p) => ({ ...p, name: v.trim() ? v.slice(0, 40) : undefined }))}
          placeholder="Your first name"
          width="100%"
        />

        <NumberInput
          label="Your age"
          value={profile.motherAge ?? null}
          onChange={(v) => setProfile((p) => ({ ...p, motherAge: v === null || Number.isNaN(v) ? undefined : Math.round(v) }))}
          hasClear
          min={12}
          max={70}
          step={1}
          placeholder="e.g. 29"
          width="100%"
        />

        <TextInput
          label="Baby's name"
          value={profile.babyName ?? ""}
          onChange={(v) => setProfile((p) => ({ ...p, babyName: v.trim() ? v.slice(0, 40) : undefined }))}
          placeholder="Optional"
          width="100%"
        />

        <DateInput
          label="Baby's birthday"
          width="100%"
          format="date"
          value={profile.babyBirth as ISODateString | undefined}
          max={dateKey(now) as ISODateString}
          onChange={(v) => setProfile((p) => ({ ...p, babyBirth: v || undefined }))}
        />

        <Selector
          label="How are you feeding your baby?"
          options={FEEDING}
          value={profile.feeding ?? ""}
          onChange={(v) => setProfile((p) => ({ ...p, feeding: (v || undefined) as Feeding | undefined }))}
          placeholder="Choose one"
          width="100%"
        />

        <div>
          <p className="mb-2 text-sm font-semibold">Is this your first baby?</p>
          <SegmentedControl
            label="First baby"
            value={firstBaby}
            onChange={(v) => setProfile((p) => ({ ...p, firstBaby: v === "" ? undefined : v === "yes" }))}
          >
            <SegmentedControlItem value="yes" label="Yes" />
            <SegmentedControlItem value="no" label="No" />
            <SegmentedControlItem value="" label="Skip" />
          </SegmentedControl>
        </div>
      </div>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Saved only on this phone. Your age and feeding choice are shared with Bloom&apos;s AI so replies fit you; your names never are.
      </p>
    </section>
  );
}
