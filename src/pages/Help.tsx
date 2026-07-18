import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../components/ui";

interface GuideSection {
  heading: string;
  items: string[];
}
interface GuideContent {
  title: string;
  intro: string;
  viewer: GuideSection;
  referee: GuideSection;
  back: string;
}

const CONTENT: Record<"th" | "en", GuideContent> = {
  th: {
    title: "คู่มือการใช้งาน",
    intro: "เว็บนี้ใช้จัดและติดตามการแข่งขันหมากกระดาน ผู้ชมเปิดดูได้โดยไม่ต้องล็อกอิน ส่วนกรรมการใช้ PIN เพื่อบันทึกผล",
    viewer: {
      heading: "สำหรับผู้ชม",
      items: [
        "เปิดลิงก์ที่กรรมการแชร์ให้ได้เลย ไม่ต้องสมัครหรือล็อกอิน",
        "หน้าแรกเลือกประเภทเกม (หมากรุกไทย, สากล, หมากล้อม, หมากฮอส, ครอสเวิร์ด, เอแมท, บอร์ดเกม)",
        "เลือกทัวร์นาเมนต์ที่ต้องการดู",
        "มีแท็บให้ดู: ตารางคะแนน (อันดับ), ผลการแข่ง (แต่ละคู่), สายแข่ง (เฉพาะน็อกเอาต์), และผู้เข้าแข่ง",
        "ข้อมูลอัปเดตอัตโนมัติทุกไม่กี่วินาที เปิดพร้อมกันหลายเครื่องได้",
        "ปุ่มมุมขวาบนใช้สลับภาษา ไทย/อังกฤษ และโหมดสว่าง/มืด",
      ],
    },
    referee: {
      heading: "สำหรับกรรมการ",
      items: [
        "สร้างทัวร์นาเมนต์: เลือกเกม → “สร้างทัวร์นาเมนต์ใหม่” → ใส่ชื่อ, เลือกระบบจับคู่, ตั้งคะแนน ชนะ/เสมอ/แพ้, ตั้ง PIN, ใส่รายชื่อผู้เข้าแข่ง (พิมพ์ทีละบรรทัดหรือวางทั้งชุด 1–50 คน) แล้วกดสร้าง",
        "ระบบจับคู่ — บันทึกอิสระ: เพิ่มคู่แข่งเองทีละคู่ | พบกันหมด: กด “สร้างตารางแข่ง” ครั้งเดียวจับครบทุกคู่ | สวิส: กด “สร้างรอบถัดไป” ทีละรอบ จับคนคะแนนใกล้กัน | น็อกเอาต์: กด “สร้างสายแข่ง” ผู้ชนะเลื่อนสายอัตโนมัติ มีชิงที่ 3",
        "เข้าโหมดกรรมการ: กด “เข้าสู่โหมดกรรมการ” แล้วใส่ PIN ระบบจะจำไว้จนกว่าจะปิดแท็บ",
        "กรอกผล: แท็บ “ผลการแข่ง” กดปุ่มผู้ชนะหรือเสมอ และใส่แต้มดิบได้ถ้าต้องการ (ไม่บังคับ) — น็อกเอาต์ต้องเลือกผู้ชนะเสมอ (เสมอไม่ได้)",
        "จัดการผู้เล่น: แท็บ “ผู้เข้าแข่ง” เพิ่มหรือลบผู้เล่นได้ (ลบได้เฉพาะคนที่ยังไม่มีแมตช์)",
        "ปิดการแข่งขัน: เมื่อจบแล้วกด “ปิดการแข่งขัน” รายการจะย้ายไปหมวด “จบแล้ว” (เปิดกลับมาแก้ได้)",
        "ลบทัวร์นาเมนต์: ที่หน้ารายการของเกม กดปุ่ม “ลบ” ข้างชื่อ แล้วใส่ PIN ยืนยัน",
        "PIN สำคัญ: ใครมี PIN ก็แก้ไขข้อมูลได้ อย่าเปิดเผยให้ผู้ชมทั่วไป",
      ],
    },
    back: "← กลับหน้าแรก",
  },
  en: {
    title: "User Guide",
    intro: "This site runs and tracks board-game tournaments. Viewers can watch without logging in; referees use a PIN to record results.",
    viewer: {
      heading: "For viewers",
      items: [
        "Open the link the referee shares — no sign-up or login needed.",
        "On the home page pick a game category (Thai Chess, Chess, Go, Checkers, Crossword, A-Math, Board Game).",
        "Choose the tournament you want to watch.",
        "Tabs available: Standings (ranking), Matches (each pairing), Bracket (knockout only), and Players.",
        "Data refreshes automatically every few seconds; several devices can watch at once.",
        "The top-right buttons switch language (Thai/English) and light/dark mode.",
      ],
    },
    referee: {
      heading: "For referees",
      items: [
        "Create a tournament: pick a game → “New tournament” → enter a name, choose a pairing format, set win/draw/loss points, set a PIN, add player names (one per line or paste a list, 1–50 players), then create.",
        "Pairing formats — Free entry: add matches yourself | Round robin: press “Generate schedule” once for all pairings | Swiss: press “Create next round” each round to pair close scores | Knockout: press “Generate bracket”; winners advance automatically, with a third-place match.",
        "Enter referee mode: press “Enter referee mode” and type the PIN; it is remembered until you close the tab.",
        "Record results: on the “Matches” tab press the winner or draw button, and optionally enter raw scores — knockout matches must have a winner (no draw).",
        "Manage players: on the “Players” tab add or remove players (removal only while they have no matches).",
        "Finish a tournament: when done press “Finish tournament”; it moves to the “Finished” section (can be reopened).",
        "Delete a tournament: on the game's list page press the “Remove” button next to its name and confirm with the PIN.",
        "The PIN matters: anyone with it can edit — don't share it with general viewers.",
      ],
    },
    back: "← Back to home",
  },
};

export function Help() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? CONTENT.en : CONTENT.th;

  const Section = ({ s }: { s: GuideSection }) => (
    <Card style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>{s.heading}</h3>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
        {s.items.map((it, i) => (
          <li key={i} style={{ lineHeight: 1.6 }}>{it}</li>
        ))}
      </ol>
    </Card>
  );

  return (
    <div>
      <Link to="/" style={{ color: "var(--text-muted)" }}>{c.back}</Link>
      <h2 style={{ marginBottom: 4 }}>{c.title}</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>{c.intro}</p>
      <Section s={c.viewer} />
      <Section s={c.referee} />
    </div>
  );
}
