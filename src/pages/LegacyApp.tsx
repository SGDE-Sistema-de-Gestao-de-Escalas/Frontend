import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  Users,
  Calendar,
  FileText,
  LogOut,
  Bell,
  Shield,
  Clock,
  Coffee,
  UserX,
  Eye,
  Check,
  X,
  Plus,
  Upload,
  ChevronRight,
  Home,
  Inbox,
  User,
  Menu,
  ArrowLeft,
  ChevronLeft,
  Paperclip,
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit2,
  Layers,
  UserPlus,
  Save,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Download,
  Repeat,
  Umbrella,
  History,
  Activity,
  Info,
  AlertCircle,
  MoreHorizontal,
  Sliders,
  Building2,
  MapPin,
  Globe,
  Pencil,
  Trash2,
  Lock,
  Truck,
  ShoppingBag,
  Sparkles,
  Moon,
  Sun,
  Maximize2,
  Search,
  Languages,
  GanttChart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from "recharts";
import {
  absences as ABSENCES,
  absenceTypes as ABSENCE_TYPES_MOCK,
  assistants as ASSISTANTS,
  schools as SCHOOLS,
} from "../api/mockData";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "admin" | "staff";
type AdminPage = "dashboard" | "config" | "profile" | "absences" | "add-assistant" | "assistants" | "reports" | "account" | "platform-settings" | "gantt";
type StaffPage = "schedule" | "register-absence" | "account" | "absence-detail";
type ConfigTab = "security" | "windows" | "holidays" | "activity-types";
type BlockState = "work" | "surveillance" | "lunch" | "absent" | "off" | "cleaning" | "collection" | "delivery";

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

// Visible time window: 06:00–21:00
const VIEW_START = 24;  // slot 24 = 06:00
const VIEW_END   = 84;  // slot 84 = 21:00 (exclusive)
const VIEW_SLOTS = VIEW_END - VIEW_START; // 60 slots = 15 hours

// ─── Schools / Agrupamento ────────────────────────────────────────────────────

const AGRUPAMENTO = { id: 1, name: "Agrupamento de Escolas de Lisboa Norte", code: "AELN" };

// Slot reference: slot = (hour - 0) * 4 + minute/15
// 7h=28  8h=32  9h=36  10h=40  10h30=42  11h=44  11h30=46
// 12h=48  12h30=50  13h=52  13h30=54  14h=56  15h=60  16h=64  17h=68

function buildAssistantRow(id: number): BlockState[] {
  const row: BlockState[] = Array(96).fill("off");
  const fill = (from: number, to: number, state: BlockState) => {
    for (let i = from; i < to; i++) row[i] = state;
  };
  switch (id) {
    case 1: // Elena Rodrigues — 7h-15h: surveillance 7-8 | work 8-11:30 | lunch 11:30-12:30 | work 12:30-15h
      fill(28, 32, "surveillance"); fill(32, 46, "work"); fill(46, 50, "lunch"); fill(50, 60, "work"); break;
    case 2: // Bruno Mendes — Licença Parentalidade → absent
      row.fill("absent"); break;
    case 3: // Carla Sousa — 10h-17h: work 10-12 | lunch 12-13 | work 13-16 | cleaning 16-17
      fill(40, 48, "work"); fill(48, 52, "lunch"); fill(52, 64, "work"); fill(64, 68, "cleaning"); break;
    case 4: // Daniel Costa — 7h-15h: collection 7-8 | work 8-12 | lunch 12-13 | work 13-15
      fill(28, 32, "collection"); fill(32, 48, "work"); fill(48, 52, "lunch"); fill(52, 60, "work"); break;
    case 5: // Ana Costa — 6h: 10h-16h: work 10-12:30 | lunch 12:30-13:30 | work 13:30-16
      fill(40, 50, "work"); fill(50, 54, "lunch"); fill(54, 64, "work"); break;
    case 6: // Fábio Lopes — 7h-14h: work 7-9 | surveillance 9-10 | work 10-11:30 | lunch 11:30-12:30 | work 12:30-14
      fill(28, 36, "work"); fill(36, 40, "surveillance"); fill(40, 46, "work"); fill(46, 50, "lunch"); fill(50, 56, "work"); break;
    case 7: // Graça Nunes — 10h-17h: surveillance 10-11 | work 11-13 | lunch 13-13:30 | work 13:30-17
      fill(40, 44, "surveillance"); fill(44, 52, "work"); fill(52, 54, "lunch"); fill(54, 68, "work"); break;
    case 8: // Hugo Martins — 7h-14h: work 7-11:30 | lunch 11:30-12:30 | cleaning 12:30-14
      fill(28, 46, "work"); fill(46, 50, "lunch"); fill(50, 56, "cleaning"); break;
    case 9: // Inês Pinto — 10h-17h: delivery 10-11 | work 11-12:30 | lunch 12:30-13:30 | work 13:30-17
      fill(40, 44, "delivery"); fill(44, 50, "work"); fill(50, 54, "lunch"); fill(54, 68, "work"); break;
    case 10: // João Alves — 7h-15h: work 7-11 | surveillance 11-11:30 | lunch 11:30-12:30 | work 12:30-15
      fill(28, 44, "work"); fill(44, 46, "surveillance"); fill(46, 50, "lunch"); fill(50, 60, "work"); break;
    case 11: // Kátia Ramos — 10h-17h: collection 10-10:30 | work 10:30-13 | lunch 13-13:30 | work 13:30-17
      fill(40, 42, "collection"); fill(42, 52, "work"); fill(52, 54, "lunch"); fill(54, 68, "work"); break;
    case 12: // Luís Santos — 7h-14h: work 7-9 | cleaning 9-10 | work 10-12 | lunch 12-13 | work 13-14
      fill(28, 36, "work"); fill(36, 40, "cleaning"); fill(40, 48, "work"); fill(48, 52, "lunch"); fill(52, 56, "work"); break;
  }
  return row;
}

function generateMatrix(): Record<number, BlockState[]> {
  const matrix: Record<number, BlockState[]> = {};
  ASSISTANTS.forEach((a) => { matrix[a.id] = buildAssistantRow(a.id); });
  return matrix;
}

const SCHEDULE_MATRIX = generateMatrix();

// ─── Multi-day data helpers ───────────────────────────────────────────────────

// dayOffset 0 = today (Mon Jan 27, 2026) in this fictional calendar
// DOW: 0=Mon … 4=Fri, 5=Sat, 6=Sun
function generateDayMatrix(dayOffset: number): Record<number, BlockState[]> {
  const dow = ((dayOffset % 7) + 7) % 7;
  const isWeekend = dow >= 5;
  const matrix: Record<number, BlockState[]> = {};
  // day-specific absences: assistant id → list of DOW they're absent
  const absentOn: Record<number, number[]> = { 8: [1], 10: [3, 4], 3: [2] };
  ASSISTANTS.forEach((a) => {
    if (isWeekend) { matrix[a.id] = Array(96).fill("off") as BlockState[]; return; }
    if (a.exception === "Licença Parentalidade" || absentOn[a.id]?.includes(dow)) {
      matrix[a.id] = Array(96).fill("absent") as BlockState[]; return;
    }
    matrix[a.id] = buildAssistantRow(a.id);
  });
  return matrix;
}

// DATE_INFO: index 0 = Jan 20, 2026 (one week before today). Index 7 = Jan 27 (today, offset 0).
const DATE_INFO = (() => {
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dayShorts = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const months = ["Jan", "Fev", "Mar", "Abr"];
  const daysPerMonth = [31, 28, 31, 30];
  const result: { dayName: string; dayShort: string; dateStr: string; day: number; monthLabel: string; dow: number }[] = [];
  let mIdx = 0; let day = 20; let dow = 0; // Jan 20 = Monday in our fictional calendar
  for (let i = 0; i < 49; i++) {
    result.push({ dayName: dayNames[dow], dayShort: dayShorts[dow], dateStr: `${day.toString().padStart(2, "0")} ${months[mIdx]}`, day, monthLabel: `${months[mIdx]} 2026`, dow });
    day++; dow = (dow + 1) % 7;
    if (day > daysPerMonth[mIdx]) { day = 1; mIdx++; }
  }
  return result;
})();
// getDateInfo(offset): offset 0 = today (Jan 27), offset -7 = one week back
function getDateInfo(offset: number) { return DATE_INFO[Math.max(0, Math.min(offset + 7, DATE_INFO.length - 1))]; }

// Dashboard months: aligned to our fictional calendar (Jan 27 = Monday = offset 0, Jan 1 = offset -26)
const DASHBOARD_MONTHS = [
  { name: "Janeiro 2026",  days: 31, firstDow: 2, firstOffset: -26 }, // Jan 1 = Wed
  { name: "Fevereiro 2026",days: 28, firstDow: 5, firstOffset: 5  }, // Feb 1 = Sat
  { name: "Março 2026",    days: 31, firstDow: 5, firstOffset: 33 }, // Mar 1 = Sat
];

function getDayCoverage(offset: number) {
  const matrix = generateDayMatrix(offset);
  const dow = ((offset % 7) + 7) % 7;
  if (dow >= 5) return { active: 0, isWeekend: true };
  let active = 0;
  ASSISTANTS.forEach((a) => { if (matrix[a.id].some((s) => s !== "off")) active++; });
  return { active, isWeekend: false };
}

const BLOCK_STYLES: Record<BlockState, { bg: string; label: string; icon: React.ReactNode; locked?: boolean }> = {
  work:        { bg: "bg-[#6366F1]",  label: "Trabalho",     icon: <Clock size={8} /> },
  surveillance:{ bg: "bg-[#A855F7]",  label: "Vigilância",   icon: <Eye size={8} /> },
  lunch:       { bg: "bg-[#F59E0B]",  label: "Pausa Almoço", icon: <Coffee size={8} /> },
  absent:      { bg: "bg-[#EF4444]",  label: "Ausente",      icon: <UserX size={8} /> },
  off:         { bg: "bg-transparent border border-[#E8EBF2]", label: "Inativo", icon: null },
  cleaning:    { bg: "bg-[#06B6D4]",  label: "Limpeza",      icon: <Sparkles size={8} /> },
  collection:  { bg: "bg-[#EC4899]",  label: "Recolha",      icon: <Truck size={8} />,       locked: true },
  delivery:    { bg: "bg-[#10B981]",  label: "Entrega",       icon: <ShoppingBag size={8} />, locked: true },
};

// ─── Calendar Months Data ─────────────────────────────────────────────────────

const PROFILE_MONTHS = [
  { label: "Outubro 2025",  days: 31, offset: 2, sickDay: null },
  { label: "Novembro 2025", days: 30, offset: 5, sickDay: null },
  { label: "Dezembro 2025", days: 31, offset: 0, sickDay: null },
  { label: "Janeiro 2026",  days: 31, offset: 3, sickDay: 15, todayDay: 27 },
  { label: "Fevereiro 2026",days: 28, offset: 6, sickDay: null },
  { label: "Março 2026",    days: 31, offset: 6, sickDay: null },
];

// ─── Notifications Data ───────────────────────────────────────────────────────

type NotifType = "alert" | "absence" | "expiry" | "info";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "alert",   title: "Cobertura insuficiente",       body: "Apenas 2 assistentes entre 08h–09h em 27 Jan. Mínimo exigido: 3.", time: "há 5 min",   read: false },
  { id: 2, type: "alert",   title: "Cobertura insuficiente",       body: "Apenas 1 assistente entre 20h–21h em 27 Jan. Mínimo exigido: 2.", time: "há 5 min",   read: false },
  { id: 3, type: "absence", title: "Novo pedido de falta",         body: "João Alves solicitou ausência de 27–31 Jan (Doença, urgente).",   time: "há 12 min",  read: false },
  { id: 4, type: "absence", title: "Novo pedido de falta",         body: "Hugo Martins solicitou ausência de 03–05 Fev (Doença).",          time: "há 1 hora",  read: false },
  { id: 5, type: "expiry",  title: "Exceção prestes a expirar",    body: "Licença Amamentação de Elena Rodrigues expira em 14 Set 2026 (231 dias).", time: "hoje",  read: true  },
  { id: 6, type: "info",    title: "Horário recalculado",          body: "Escala de 26 Jan recalculada com sucesso após aprovação da falta de Fábio Lopes.", time: "ontem", read: true },
  { id: 7, type: "info",    title: "Lotação atualizada",           body: "Regra de lotação alterada para 12 assistentes com vigência a partir de 01 Jan 2026.", time: "há 3 dias", read: true },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "purple" | "muted" }) {
  const styles = {
    default: "bg-accent/10 text-accent",
    success: "bg-[#0E7C59]/10 text-[#0E7C59]",
    warning: "bg-[#D97706]/10 text-[#D97706]",
    danger: "bg-destructive/10 text-destructive",
    purple: "bg-[#7C3AED]/10 text-[#7C3AED]",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono ${styles[variant]}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, maxWidth = "max-w-lg" }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`bg-card border border-border rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Custom Date & Time Pickers ───────────────────────────────────────────────

// Operating hours constants (can be made dynamic later)
const OPERATING_START = 6;  // 06:00
const OPERATING_END = 21;   // 21:00
const QUARTER_MINUTES = [0, 15, 30, 45];

function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "AAAA-MM-DD",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Parse value to year/month/day
  const parsed = value ? new Date(value + "T12:00:00") : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  // Convert to Mon-first: 0=Mon…6=Sun
  const firstDowMon = (firstDow + 6) % 7;

  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const dayLabels = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const displayValue = parsed
    ? parsed.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!open && parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
          setOpen((v) => !v);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring text-left hover:border-accent/40 transition-colors"
      >
        <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
        <span className={displayValue ? "text-foreground" : "text-muted-foreground/50"}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-card border border-border rounded-xl shadow-xl p-3 w-64">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft size={14} className="text-muted-foreground" />
            </button>
            <span className="text-xs font-semibold text-foreground">{monthNames[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDowMon }).map((_, i) => <div key={`pre-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const iso = `${viewYear}-${mm}-${dd}`;
              const isSelected = value === iso;
              const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-full aspect-square flex items-center justify-center text-[11px] font-mono rounded-lg transition-colors
                    ${isSelected ? "bg-accent text-white font-bold" : isToday ? "bg-accent/10 text-accent font-semibold" : "text-foreground hover:bg-muted"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2.5 pt-2 border-t border-border flex justify-between">
            <button type="button" onClick={() => onChange("")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Limpar</button>
            <button
              type="button"
              onClick={() => {
                const d = today;
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                onChange(`${d.getFullYear()}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  className = "",
  operatingStart = OPERATING_START,
  operatingEnd = OPERATING_END,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  operatingStart?: number;
  operatingEnd?: number;
}) {
  const parts = value ? value.split(":") : ["06", "00"];
  const hVal = parseInt(parts[0]) || operatingStart;
  const mVal = parseInt(parts[1]) || 0;

  const hours = Array.from({ length: operatingEnd - operatingStart + 1 }, (_, i) => operatingStart + i);
  const validMinutes = hVal === operatingEnd ? [0] : QUARTER_MINUTES;

  function setHour(h: number) {
    const clampedMin = h === operatingEnd ? 0 : (QUARTER_MINUTES.includes(mVal) ? mVal : 0);
    onChange(`${String(h).padStart(2, "0")}:${String(clampedMin).padStart(2, "0")}`);
  }
  function setMinute(m: number) {
    onChange(`${String(hVal).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        value={hVal}
        onChange={(e) => setHour(Number(e.target.value))}
        className="flex-1 px-2 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {hours.map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>
        ))}
      </select>
      <span className="text-muted-foreground text-sm font-mono">:</span>
      <select
        value={mVal}
        onChange={(e) => setMinute(Number(e.target.value))}
        className="flex-1 px-2 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {validMinutes.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Theme + Header primitives (Pinx) ─────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);
  return [dark, setDark] as const;
}

function HeaderIcon({
  onClick,
  title,
  children,
  className = "",
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function toggleFullscreen() {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

// ─── Feature Data ─────────────────────────────────────────────────────────────

// Cobertura diária da semana actual vs mínimo exigido
const REPORTS_COVERAGE = [
  { day: "Seg", present: 10, min: 8 },
  { day: "Ter", present: 9,  min: 8 },
  { day: "Qua", present: 11, min: 8 },
  { day: "Qui", present: 8,  min: 8 },
  { day: "Sex", present: 7,  min: 8 },
];
// Alertas de cobertura insuficiente por mês
const REPORTS_ALERTAS = [
  { month: "Set", alerts: 2 },
  { month: "Out", alerts: 4 },
  { month: "Nov", alerts: 6 },
  { month: "Dez", alerts: 5 },
  { month: "Jan", alerts: 3 },
];
// Ausências por tipo (Jan 2026)
const REPORTS_ABSENCE_TYPES = [
  { type: "Doença",              count: 8,  color: "#EF4444" },
  { type: "Licença Legal",       count: 22, color: "#A855F7" },
  { type: "Consulta Médica",     count: 3,  color: "#F59E0B" },
  { type: "Pessoal",             count: 2,  color: "#6366F1" },
];
// Ausências do mês com impacto
const REPORTS_AUSENCIAS = [
  { name: "Bruno Mendes",   initials: "BM", days: 22, type: "Licença Parentalidade", status: "approved", cobertura: "sem impacto" },
  { name: "João Alves",     initials: "JA", days: 5,  type: "Doença",                status: "pending",  cobertura: "impacto alto" },
  { name: "Hugo Martins",   initials: "HM", days: 4,  type: "Doença",                status: "approved", cobertura: "impacto médio" },
  { name: "Fábio Lopes",    initials: "FL", days: 3,  type: "Doença",                status: "approved", cobertura: "impacto médio" },
  { name: "Elena Rodrigues",initials: "ER", days: 3,  type: "Consulta Médica",        status: "approved", cobertura: "impacto baixo" },
  { name: "Carla Sousa",    initials: "CS", days: 2,  type: "Pessoal",               status: "approved", cobertura: "impacto baixo" },
  { name: "Inês Pinto",     initials: "IP", days: 1,  type: "Consulta Médica",        status: "rejected", cobertura: "sem impacto" },
  { name: "Ana Ferreira",   initials: "AF", days: 0,  type: "—",                     status: "none",     cobertura: "sem impacto" },
];

const SWAP_REQUESTS = [
  { id: 1, from: "Ana Ferreira",  fromInit: "AF", to: "Fábio Lopes",    toInit: "FL", date: "03 Fev 2026", fromBlock: "08:00–16:00", toBlock: "07:30–15:30", reason: "Compromisso pessoal", status: "pending",  submitted: "27 Jan 2026" },
  { id: 2, from: "Inês Pinto",    fromInit: "IP", to: "Kátia Ramos",    toInit: "KR", date: "05 Fev 2026", fromBlock: "14:00–22:00", toBlock: "07:30–15:30", reason: "Consulta médica",    status: "pending",  submitted: "26 Jan 2026" },
  { id: 3, from: "Daniel Costa",  fromInit: "DC", to: "Graça Nunes",    toInit: "GN", date: "29 Jan 2026", fromBlock: "07:30–15:30", toBlock: "08:00–16:00", reason: "Assuntos pessoais", status: "approved", submitted: "24 Jan 2026" },
  { id: 4, from: "Luís Santos",   fromInit: "LS", to: "Hugo Martins",   toInit: "HM", date: "31 Jan 2026", fromBlock: "08:00–16:00", toBlock: "07:30–15:30", reason: "Transporte",         status: "rejected", submitted: "22 Jan 2026" },
];

const HOLIDAYS = [
  { id: 1, name: "Carnaval",               date: "03 Mar 2026", type: "nacional",  impact: "baixo" },
  { id: 2, name: "Sexta-feira Santa",      date: "03 Abr 2026", type: "nacional",  impact: "alto"  },
  { id: 3, name: "Páscoa",                 date: "05 Abr 2026", type: "nacional",  impact: "alto"  },
  { id: 4, name: "Dia do Trabalhador",     date: "01 Mai 2026", type: "nacional",  impact: "alto"  },
  { id: 5, name: "Feriado Municipal Lisboa",date: "13 Jun 2026", type: "municipal", impact: "médio" },
  { id: 6, name: "Assunção de Nossa Sra.", date: "15 Ago 2026", type: "nacional",  impact: "alto"  },
];

const AUDIT_LOG = [
  { id: 1,  ts: "27 Jan 2026 14:32", user: "Miguel Silva",  action: "Aprovação de falta",         entity: "Ausências",     detail: "Aprovada falta de Fábio Lopes (20–22 Jan)",              type: "approve"  },
  { id: 2,  ts: "27 Jan 2026 14:30", user: "Sistema",       action: "Recálculo de escala",        entity: "Dashboard",     detail: "Escala de 20–26 Jan recalculada após aprovação",          type: "system"   },
  { id: 3,  ts: "27 Jan 2026 11:15", user: "Miguel Silva",  action: "Alteração de regra",         entity: "Configurações", detail: "Mínimo tarde 13h–20h alterado de 3 para 4 assistentes",  type: "edit"     },
  { id: 4,  ts: "26 Jan 2026 17:45", user: "Miguel Silva",  action: "Criação de exceção",         entity: "Perfil",        detail: "Licença amamentação adicionada a Elena Rodrigues",        type: "create"   },
  { id: 5,  ts: "26 Jan 2026 09:20", user: "Sistema",       action: "Alerta de cobertura",        entity: "Dashboard",     detail: "Cobertura insuficiente detectada 08h–09h em 27 Jan",      type: "alert"    },
  { id: 6,  ts: "25 Jan 2026 16:00", user: "Miguel Silva",  action: "Rejeição de falta",          entity: "Ausências",     detail: "Rejeitada falta de Inês Pinto (15 Jan)",                  type: "reject"   },
  { id: 7,  ts: "24 Jan 2026 10:30", user: "Miguel Silva",  action: "Regra de lotação editada",   entity: "Configurações", detail: "Lotação alterada: 14 → 12 assistentes (vigência 01/01/26)", type: "edit"   },
  { id: 8,  ts: "23 Jan 2026 15:10", user: "Sistema",       action: "Recálculo automático",       entity: "Dashboard",     detail: "Recálculo semanal de escala (sem 23–29 Jan)",             type: "system"   },
  { id: 9,  ts: "22 Jan 2026 14:00", user: "Miguel Silva",  action: "Aprovação de troca",         entity: "Trocas",        detail: "Troca aprovada: Daniel Costa ↔ Graça Nunes (29 Jan)",     type: "approve"  },
  { id: 10, ts: "20 Jan 2026 09:00", user: "Ana Ferreira",  action: "Pedido de troca",            entity: "Trocas",        detail: "Troca solicitada para 03 Fev: AF ↔ FL",                   type: "create"   },
];

// ─── Dashboard View: Week Matrix ─────────────────────────────────────────────

function WeekMatrixView({
  weekStart,
  onSelectDay,
  onSelectAssistant,
}: {
  weekStart: number;
  onSelectDay: (offset: number) => void;
  onSelectAssistant: (id: number) => void;
}) {
  const weekOffsets = Array.from({ length: 7 }, (_, i) => weekStart + i);

  return (
    <Card className="overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-4">
        {(["work", "surveillance", "cleaning", "collection", "delivery", "lunch", "absent"] as BlockState[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg} flex items-center justify-center`}>
              {BLOCK_STYLES[s].locked && <Lock size={6} className="text-white/70" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{BLOCK_STYLES[s].label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">Clique num dia para vista diária · Clique num nome para horário detalhado</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* Day column headers */}
          <div className="flex border-b border-border bg-muted/10">
            <div className="w-36 flex-shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium">
              Assistente
            </div>
            {weekOffsets.map((offset) => {
              const info = getDateInfo(offset);
              const isToday = offset === 0;
              const isWeekend = info.dow >= 5;
              return (
                <button
                  key={offset}
                  onClick={() => !isWeekend && onSelectDay(offset)}
                  className={`flex-1 px-2 py-2 text-center border-r border-border/50 last:border-0 transition-colors
                    ${isWeekend ? "bg-muted/20 cursor-default" : "hover:bg-accent/8 cursor-pointer"}
                    ${isToday ? "bg-accent/10" : ""}
                  `}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : isWeekend ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                    {info.dayShort}
                  </p>
                  <p className={`text-xs font-mono mt-0.5 ${isToday ? "text-accent font-bold" : isWeekend ? "text-muted-foreground/40" : "text-foreground"}`}>
                    {info.dateStr}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Assistant rows */}
          {ASSISTANTS.map((assistant) => (
            <div key={assistant.id} className="flex border-b border-border/50 hover:bg-muted/10 transition-colors">
              <button
                className="w-36 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-accent/5 transition-colors text-left"
                onClick={() => onSelectAssistant(assistant.id)}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-primary font-mono">{assistant.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground hover:text-accent truncate transition-colors">{assistant.name.split(" ")[0]}</p>
                  {assistant.exception && <p className="text-[9px] text-[#D97706] truncate">{assistant.exception}</p>}
                </div>
              </button>
              {weekOffsets.map((offset) => {
                const matrix = generateDayMatrix(offset);
                const slots = matrix[assistant.id];
                const info = getDateInfo(offset);
                const isWeekend = info.dow >= 5;
                const isToday = offset === 0;
                return (
                  <button
                    key={offset}
                    onClick={() => !isWeekend && onSelectDay(offset)}
                    className={`flex-1 h-10 border-r border-border/50 last:border-0 overflow-hidden transition-opacity
                      ${isWeekend ? "bg-muted/20 cursor-default" : "hover:opacity-90 cursor-pointer"}
                      ${isToday ? "ring-1 ring-inset ring-accent/30" : ""}
                    `}
                  >
                    <div className="relative w-full h-full">
                      {isToday && <div className="absolute inset-0 bg-accent/5" />}
                      {slotsToBlocks(slots).map((b) => {
                        const cs = Math.max(b.start, VIEW_START);
                        const ce = Math.min(b.start + b.count, VIEW_END);
                        if (b.state === "off" || ce <= cs) return null;
                        return (
                          <div
                            key={b.start}
                            className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-80 overflow-hidden`}
                            style={{ left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`, width: `${((ce - cs) / VIEW_SLOTS) * 100}%` }}
                          >
                            {BLOCK_STYLES[b.state].locked && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Lock size={7} className="text-white/50" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Dashboard View: Month Calendar ──────────────────────────────────────────

function MonthDashboardView({
  monthOffset,
  onSelectDay,
  onChangeMonth,
}: {
  monthOffset: number;
  onSelectDay: (offset: number) => void;
  onChangeMonth: (delta: number) => void;
}) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const month = DASHBOARD_MONTHS[Math.max(0, Math.min(monthOffset, DASHBOARD_MONTHS.length - 1))];

  const coverageByDay = Array.from({ length: month.days }, (_, i) => {
    const offset = month.firstOffset + i;
    return getDayCoverage(offset);
  });

  function coverageColor(active: number, isWeekend: boolean) {
    if (isWeekend) return "bg-muted/20";
    if (active >= 10) return "bg-[#0E7C59]/15";
    if (active >= 8)  return "bg-[#D97706]/15";
    return "bg-[#C8291A]/15";
  }
  function coverageDot(active: number, isWeekend: boolean) {
    if (isWeekend) return "";
    if (active >= 10) return "bg-[#0E7C59]";
    if (active >= 8)  return "bg-[#D97706]";
    return "bg-[#C8291A]";
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card className="px-4 py-3 flex items-center gap-6">
        <span className="text-xs text-muted-foreground font-medium">Cobertura:</span>
        {[
          { dot: "bg-[#0E7C59]", label: "≥ 10 assistentes" },
          { dot: "bg-[#D97706]", label: "8 – 9 assistentes" },
          { dot: "bg-[#C8291A]", label: "< 8 assistentes" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.dot}`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">Clique num dia para ver a matriz completa</span>
      </Card>

      <Card className="overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => onChangeMonth(-1)} disabled={monthOffset === 0} className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground">{month.name}</span>
          <button onClick={() => onChangeMonth(1)} disabled={monthOffset >= DASHBOARD_MONTHS.length - 1} className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* DOW headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d} className="text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/50 last:border-0">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: month.firstDow }, (_, i) => (
            <div key={`pre-${i}`} className="h-20 border-r border-b border-border/30 bg-muted/5" />
          ))}
          {Array.from({ length: month.days }, (_, i) => {
            const dayNum = i + 1;
            const offset = month.firstOffset + i;
            const cov = coverageByDay[i];
            const isToday = offset === 0;
            const isHovered = hoveredDay === dayNum;
            const isSunCol = (month.firstDow + i) % 7 === 6;
            return (
              <button
                key={dayNum}
                onClick={() => !cov.isWeekend && onSelectDay(offset)}
                onMouseEnter={() => setHoveredDay(dayNum)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-20 p-2 text-left border-r border-b border-border/30 transition-colors flex flex-col
                  ${cov.isWeekend ? "cursor-default bg-muted/10" : `cursor-pointer ${coverageColor(cov.active, false)} hover:brightness-95`}
                  ${isToday ? "ring-2 ring-inset ring-accent" : ""}
                  ${isSunCol ? "border-r-0" : ""}
                `}
              >
                <div className={`text-xs font-mono mb-1.5 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-accent text-white font-bold" : cov.isWeekend ? "text-muted-foreground/40" : "text-foreground"}`}>
                  {dayNum}
                </div>
                {!cov.isWeekend && (
                  <>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${coverageDot(cov.active, false)}`} />
                      <span className="text-[10px] font-mono text-muted-foreground">{cov.active}/12</span>
                    </div>
                    {/* Mini coverage bar */}
                    <div className="mt-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cov.active >= 10 ? "bg-[#0E7C59]" : cov.active >= 8 ? "bg-[#D97706]" : "bg-[#C8291A]"}`}
                        style={{ width: `${(cov.active / 12) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </button>
            );
          })}
          {(() => {
            const total = month.firstDow + month.days;
            const rem = total % 7;
            if (rem === 0) return null;
            return Array.from({ length: 7 - rem }, (_, i) => (
              <div key={`post-${i}`} className="h-20 border-b border-border/30 bg-muted/5" />
            ));
          })()}
        </div>
      </Card>
    </div>
  );
}

// ─── Recalcular Modal ─────────────────────────────────────────────────────────

function RecalcularModal({ onClose, currentSchoolId = 1 }: { onClose: () => void; currentSchoolId?: number }) {
  const [startDate, setStartDate] = useState("2026-01-27");
  const [endDate, setEndDate] = useState("2026-01-31");
  const [strategy, setStrategy] = useState("auto");
  const [respectExceptions, setRespectExceptions] = useState(true);
  const [step, setStep] = useState<"form" | "gap" | "done">("form");
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<number | null>(null);
  const [substituteSchoolFilter, setSubstituteSchoolFilter] = useState<number | "all">("all");

  const currentSchool = SCHOOLS.find((s) => s.id === currentSchoolId);

  // Simulated coverage gap: 2 assistants present, need 3 (rule R-001)
  const GAP = { rule: "R-001", name: "Mínimo Manhã", period: "10:00–13:00", need: 3, have: 2, date: "27 Jan 2026" };

  // Available inter-school substitutes: other schools, availableForTransfer=true, no active exception, not locked in gap period
  const _baseMatrix = generateMatrix();
  const _gapSlotStart = 40; // 10:00
  const _gapSlotEnd = 52;   // 13:00
  const otherSchools = SCHOOLS.filter((s) => s.id !== currentSchoolId && s.active);
  const substitutes = ASSISTANTS.filter((a) => {
    if (a.schoolId === currentSchoolId) return false;
    if (!a.availableForTransfer) return false;
    if (a.exception === "Licença Parentalidade") return false;
    // Exclude if any slot in the gap period is locked
    const row = _baseMatrix[a.id] ?? [];
    return !row.slice(_gapSlotStart, _gapSlotEnd).some((s) => BLOCK_STYLES[s]?.locked);
  });
  const filteredSubstitutes = substituteSchoolFilter === "all"
    ? substitutes
    : substitutes.filter((a) => a.schoolId === substituteSchoolFilter);

  const selectedSub = ASSISTANTS.find((a) => a.id === selectedSubstituteId);
  const selectedSubSchool = selectedSub ? SCHOOLS.find((s) => s.id === selectedSub.schoolId) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">

          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                {step === "form" ? "Recalcular Escala" : step === "gap" ? "Cobertura Insuficiente" : "Recálculo Concluído"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === "form" ? "Define o intervalo e as opções de recálculo"
                  : step === "gap" ? `${currentSchool?.name} · ${GAP.date}`
                  : "Escala actualizada com sucesso"}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
          </div>

          {/* Step indicator */}
          {step !== "done" && (
            <div className="px-5 py-2 border-b border-border flex items-center gap-2">
              {(["form", "gap"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className="w-6 h-px bg-border" />}
                  <div className={`flex items-center gap-1.5 text-[10px] font-medium ${step === s ? "text-accent" : step === "gap" && s === "form" ? "text-[#0E7C59]" : "text-muted-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${step === s ? "bg-accent text-white" : step === "gap" && s === "form" ? "bg-[#0E7C59] text-white" : "bg-muted text-muted-foreground"}`}>
                      {step === "gap" && s === "form" ? <Check size={8} /> : i + 1}
                    </div>
                    {s === "form" ? "Configuração" : "Cobertura Inter-escolar"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step: form ── */}
          {step === "form" && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Data de Início *</label>
                  <DatePicker value={startDate} onChange={setStartDate} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Data de Fim *</label>
                  <DatePicker value={endDate} onChange={setEndDate} className="w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Estratégia de Recálculo</label>
                <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="auto">Automático (respeitar regras em vigor)</option>
                  <option value="fill">Preencher lacunas de cobertura</option>
                  <option value="full">Recálculo completo (ignorar ajustes manuais)</option>
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={respectExceptions} onChange={(e) => setRespectExceptions(e.target.checked)} className="w-4 h-4 rounded border-border accent-accent" />
                <span className="text-sm text-foreground">Respeitar exceções individuais (licenças, carga reduzida)</span>
              </label>
              <div className="bg-[#FEF9EC] border border-[#D97706]/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={13} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">O recálculo <strong>substitui</strong> os horários manuais no intervalo seleccionado. Esta operação fica registada no log de auditoria.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("gap")} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
                  <RefreshCw size={14} />Executar Recálculo
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {/* ── Step: gap ── */}
          {step === "gap" && (
            <div className="p-5 space-y-4">
              {/* Alert */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={15} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Falha de cobertura detectada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-mono font-medium">{GAP.name} ({GAP.rule})</span> · {GAP.period} em {GAP.date}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Presentes: <span className="font-mono font-semibold text-destructive">{GAP.have}</span> · Mínimo exigido: <span className="font-mono font-semibold">{GAP.need}</span>
                  </p>
                </div>
              </div>

              {/* School filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Filtrar por escola</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSubstituteSchoolFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${substituteSchoolFilter === "all" ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    Todas
                  </button>
                  {otherSchools.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSubstituteSchoolFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${substituteSchoolFilter === s.id ? "bg-accent text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {s.name.replace("EB1 ", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Substitute list */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Assistentes disponíveis para transferência ({filteredSubstitutes.length})
                </label>
                {filteredSubstitutes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground bg-muted/30 rounded-xl">
                    Nenhum assistente disponível nesta escola
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {filteredSubstitutes.map((a) => {
                      const school = SCHOOLS.find((s) => s.id === a.schoolId);
                      const isSelected = selectedSubstituteId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelectedSubstituteId(isSelected ? null : a.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${isSelected ? "border-accent bg-accent/5" : "border-border hover:bg-muted/40"}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono ${isSelected ? "bg-accent text-white" : "bg-primary/10 text-primary"}`}>
                            {a.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? "text-accent" : "text-foreground"}`}>{a.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 size={9} />{school?.name}
                            </p>
                          </div>
                          {isSelected && <Check size={15} className="text-accent flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected summary */}
              {selectedSub && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-accent">{selectedSub.initials}</span>
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-medium text-foreground">{selectedSub.name}</span>
                    <span className="text-muted-foreground"> de </span>
                    <span className="font-medium text-foreground">{selectedSubSchool?.name}</span>
                    <span className="text-muted-foreground"> será designado para cobrir </span>
                    <span className="font-mono font-medium">{GAP.period}</span>
                    <span className="text-muted-foreground"> em {GAP.date}.</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep("done")}
                  disabled={!selectedSubstituteId}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  Confirmar Designação
                </button>
                <button onClick={() => setStep("done")} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Ignorar
                </button>
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === "done" && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-[#0E7C59]" />
              </div>
              <p className="font-semibold text-foreground">Escala Recalculada</p>
              {selectedSub ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedSub.name}</span> ({selectedSubSchool?.name}) foi designado para cobrir <span className="font-mono">{GAP.period}</span> em {GAP.date}.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">O intervalo {startDate} – {endDate} foi recalculado. A falha de cobertura ficou registada.</p>
              )}
              <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Dashboard Section (wrapper with view switching + date nav) ───────────────

type DashViewMode = "day" | "week" | "month";

function DashboardSection({ onSelectAssistant, currentSchoolId = 1 }: { onSelectAssistant: (id: number) => void; currentSchoolId?: number }) {
  const [viewMode, setViewMode] = useState<DashViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);   // active day (day view)
  const [weekStart, setWeekStart] = useState(0);    // offset of Monday shown in week view
  const [monthOffset, setMonthOffset] = useState(0); // 0=Jan, 1=Feb, 2=Mar
  const [showRecalcModal, setShowRecalcModal] = useState(false);

  // When switching views, sync the position
  function switchView(mode: DashViewMode) {
    if (mode === "week") setWeekStart(Math.floor(dayOffset / 7) * 7);
    if (mode === "day" && viewMode === "week") setDayOffset(weekStart);
    setViewMode(mode);
  }

  function navLabel() {
    if (viewMode === "day") return getDateInfo(dayOffset);
    if (viewMode === "week") {
      const start = getDateInfo(weekStart);
      const end = getDateInfo(weekStart + 6);
      return { dayName: `${start.dateStr} – ${end.dateStr}`, dateStr: "", dayShort: "", monthLabel: "", day: 0, dow: 0 };
    }
    return { dayName: DASHBOARD_MONTHS[monthOffset]?.name || "", dateStr: "", dayShort: "", monthLabel: "", day: 0, dow: 0 };
  }

  function prevNav() {
    if (viewMode === "day") setDayOffset((d) => Math.max(d - 1, -7));
    if (viewMode === "week") setWeekStart((w) => Math.max(w - 7, -7));
    if (viewMode === "month") setMonthOffset((m) => Math.max(m - 1, 0));
  }
  function nextNav() {
    if (viewMode === "day") setDayOffset((d) => Math.min(d + 1, 35));
    if (viewMode === "week") setWeekStart((w) => Math.min(w + 7, 28));
    if (viewMode === "month") setMonthOffset((m) => Math.min(m + 1, DASHBOARD_MONTHS.length - 1));
  }

  const label = navLabel();
  const matrix = viewMode === "day" ? generateDayMatrix(dayOffset) : SCHEDULE_MATRIX;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Matriz de Escalas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewMode === "day" && `${label.dayName}, ${label.dateStr}`}
            {viewMode === "week" && label.dayName}
            {viewMode === "month" && label.dayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            {(["day", "week", "month"] as DashViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchView(m)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === m ? "bg-card shadow-sm text-foreground" : "text-foreground/50 hover:text-foreground"}`}
              >
                {m === "day" ? "Dia" : m === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button onClick={prevNav} className="px-2.5 py-2 hover:bg-muted transition-colors border-r border-border">
              <ChevronLeft size={14} className="text-muted-foreground" />
            </button>
            <button onClick={() => { setDayOffset(0); setWeekStart(0); setMonthOffset(0); }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
              Hoje
            </button>
            <button onClick={nextNav} className="px-2.5 py-2 hover:bg-muted transition-colors border-l border-border">
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>

          <button onClick={() => setShowRecalcModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <RefreshCw size={14} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Alert banner only on day view */}
      {viewMode === "day" && <AlertBanner />}

      {/* Views */}
      {viewMode === "day" && (
        <MatrixGrid
          matrix={matrix}
          onSelectAssistant={onSelectAssistant}
          dateLabel={`${label.dayName}, ${label.dateStr} · blocos de 30 min`}
        />
      )}
      {viewMode === "week" && (
        <WeekMatrixView
          weekStart={weekStart}
          onSelectDay={(offset) => { setDayOffset(offset); switchView("day"); }}
          onSelectAssistant={onSelectAssistant}
        />
      )}
      {viewMode === "month" && (
        <MonthDashboardView
          monthOffset={monthOffset}
          onSelectDay={(offset) => { setDayOffset(offset); switchView("day"); }}
          onChangeMonth={(delta) => setMonthOffset((m) => Math.max(0, Math.min(m + delta, DASHBOARD_MONTHS.length - 1)))}
        />
      )}
      {showRecalcModal && <RecalcularModal onClose={() => setShowRecalcModal(false)} currentSchoolId={currentSchoolId} />}
    </div>
  );
}

// ─── Notifications Dropdown ───────────────────────────────────────────────────

const NOTIF_STYLES: Record<NotifType, { icon: React.ReactNode; dot: string; label: string }> = {
  alert:   { icon: <AlertTriangle size={13} className="text-[#C8291A]" />,  dot: "bg-[#C8291A]",  label: "Alerta" },
  absence: { icon: <FileText size={13} className="text-[#D97706]" />,        dot: "bg-[#D97706]",  label: "Falta" },
  expiry:  { icon: <Clock size={13} className="text-[#7C3AED]" />,           dot: "bg-[#7C3AED]",  label: "Vigência" },
  info:    { icon: <CheckCircle size={13} className="text-[#0E7C59]" />,     dot: "bg-[#0E7C59]",  label: "Info" },
};

function NotificationsDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-foreground" />
            <span className="text-sm font-semibold text-foreground">Notificações</span>
            {unread > 0 && (
              <span className="bg-[#C8291A] text-white text-[9px] font-mono rounded-full px-1.5 py-0.5">{unread}</span>
            )}
          </div>
          <button onClick={onMarkAllRead} className="text-xs text-accent hover:text-accent/80 transition-colors">
            Marcar todas lidas
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-px px-3 py-2 border-b border-border overflow-x-auto">
          {([
            { id: "all",     label: "Todas" },
            { id: "alert",   label: "Alertas" },
            { id: "absence", label: "Faltas" },
            { id: "expiry",  label: "Vigências" },
            { id: "info",    label: "Info" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === f.id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[420px]">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem notificações</div>
          )}
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors flex gap-3 ${
                !n.read ? "bg-accent/3" : ""
              }`}
            >
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                n.type === "alert" ? "bg-[#C8291A]/10" :
                n.type === "absence" ? "bg-[#D97706]/10" :
                n.type === "expiry" ? "bg-[#7C3AED]/10" : "bg-[#0E7C59]/10"
              }`}>
                {NOTIF_STYLES[n.type].icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{n.time}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
              </div>
              {!n.read && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${NOTIF_STYLES[n.type].dot}`} />
              )}
            </button>
          ))}
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
          <button className="text-xs text-accent hover:text-accent/80 transition-colors">Ver todas as notificações</button>
        </div>
      </div>
    </>
  );
}

// ─── Assistant Day Modal (slide-in drawer) ────────────────────────────────────

// Merge consecutive same-state slots into blocks (includes "off" for correct widths)
function slotsToBlocks(slots: BlockState[]) {
  const blocks: { state: BlockState; start: number; count: number }[] = [];
  let cur: { state: BlockState; start: number; count: number } | null = null;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (cur && cur.state === s) { cur.count++; }
    else { if (cur) blocks.push(cur); cur = { state: s, start: i, count: 1 }; }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function groupSlotsFn(slots: BlockState[]) {
  const groups: { state: BlockState; start: number; end: number }[] = [];
  let cur: { state: BlockState; start: number; end: number } | null = null;
  slots.forEach((s, i) => {
    if (s === "off") { if (cur) { groups.push(cur); cur = null; } return; }
    if (cur && cur.state === s) { cur.end = i; }
    else { if (cur) groups.push(cur); cur = { state: s, start: i, end: i }; }
  });
  if (cur) groups.push(cur);
  return groups;
}

function AssistantDayModal({
  assistantId,
  onClose,
  onViewProfile,
  onMarkAbsence,
}: {
  assistantId: number;
  onClose: () => void;
  onViewProfile: () => void;
  onMarkAbsence: (assistantName: string) => void;
}) {
  const assistant = ASSISTANTS.find((a) => a.id === assistantId)!;
  const slots = SCHEDULE_MATRIX[assistantId];
  const groups = groupSlotsFn(slots);

  const colorMap: Record<BlockState, string> = {
    work:        "border-l-[#6366F1] bg-[#6366F1]/8",
    surveillance:"border-l-[#A855F7] bg-[#A855F7]/8",
    lunch:       "border-l-[#F59E0B] bg-[#F59E0B]/8",
    absent:      "border-l-[#EF4444] bg-[#EF4444]/8",
    off:         "border-l-border bg-muted/10",
    cleaning:    "border-l-[#06B6D4] bg-[#06B6D4]/8",
    collection:  "border-l-[#EC4899] bg-[#EC4899]/8",
    delivery:    "border-l-[#10B981] bg-[#10B981]/8",
  };
  const textMap: Record<BlockState, string> = {
    work:        "text-[#6366F1]",
    surveillance:"text-[#A855F7]",
    lunch:       "text-[#F59E0B]",
    absent:      "text-[#EF4444]",
    off:         "text-muted-foreground",
    cleaning:    "text-[#06B6D4]",
    collection:  "text-[#EC4899]",
    delivery:    "text-[#10B981]",
  };

  const summary = { work: 0, surveillance: 0, cleaning: 0, collection: 0, delivery: 0, lunch: 0 };
  slots.forEach((s) => { if (s in summary) summary[s as keyof typeof summary]++; });
  const toH = (n: number) => { const mins = n * 15; return `${Math.floor(mins / 60)}h${mins % 60 ? String(mins % 60).padStart(2,"0") : ""}`; };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary font-mono">{assistant.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              {assistant.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">27 Jan 2026 · Horário do dia</p>
            {assistant.exception && (
              <div className="mt-1"><Badge variant="warning">{assistant.exception}</Badge></div>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-5 py-3 border-b border-border grid grid-cols-3 gap-2">
          {[
            { label: "Trabalho", value: toH(summary.work), color: "text-[#6366F1]" },
            { label: "Vigilância", value: toH(summary.surveillance), color: "text-[#A855F7]" },
            { label: "Pausa", value: toH(summary.lunch), color: "text-[#F59E0B]" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-mono font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem blocos activos hoje</div>
          ) : (
            groups.map((block, i) => {
              const startTime = TIME_SLOTS[block.start];
              const endTime = TIME_SLOTS[block.end + 1] || "24:00";
              const durationMin = (block.end - block.start + 1) * 15;
              const durationStr = durationMin >= 60
                ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ""}`
                : `${durationMin}min`;
              return (
                <div key={i} className={`border-l-4 rounded-r-lg px-3 py-2 ${colorMap[block.state]}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${textMap[block.state]}`}>
                      {BLOCK_STYLES[block.state].label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{durationStr}</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{startTime} – {endTime}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border space-y-2">
          <button
            onClick={() => { onClose(); onMarkAbsence(assistant.name); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            <UserX size={14} />
            Marcar Falta
          </button>
          <button
            onClick={onViewProfile}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <User size={14} />
            Ver Perfil Completo
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Quick Absence Modal ───────────────────────────────────────────────────────

function QuickAbsenceModal({ assistantName, onClose, currentSchoolId = 1 }: { assistantName: string; onClose: () => void; currentSchoolId?: number }) {
  const [start, setStart] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [end, setEnd] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("Doença");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [coverageSchool, setCoverageSchool] = useState<number | "">("");
  const [coverageAssistantId, setCoverageAssistantId] = useState<number | "">("");

  const assistant = ASSISTANTS.find((a) => a.name === assistantName);
  const otherSchools = SCHOOLS.filter((s) => s.id !== currentSchoolId && s.active);

  const _covMatrix = generateMatrix();
  // Parse absence start/end to slot range for locked check
  const _startSlot = start ? Math.floor((parseInt(start.split("-")[2] ?? "0") > 0 ? 40 : 40)) : 40;
  const coverageSubstitutes = ASSISTANTS.filter((a) => {
    if (coverageSchool === "" || a.schoolId !== coverageSchool) return false;
    if (!a.availableForTransfer) return false;
    if (a.exception === "Licença Parentalidade") return false;
    // Exclude if locked in any work slot of their schedule
    const row = _covMatrix[a.id] ?? [];
    return !row.some((s) => BLOCK_STYLES[s]?.locked);
  });

  const selectedCovSub = ASSISTANTS.find((a) => a.id === Number(coverageAssistantId));

  function submit() {
    if (!start || !end) return;
    setDone(true);
  }

  const hasDates = start && end;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Registar Ausência</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Marcar falta a um assistente</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>

          {done ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-accent" />
              </div>
              <p className="text-sm font-semibold text-foreground">Ausência registada</p>
              <p className="text-xs text-muted-foreground mt-1">
                A falta de <span className="font-medium">{assistantName}</span> foi registada com sucesso.
              </p>
              <div className="mt-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono text-muted-foreground">
                {start} {startTime} → {end} {endTime}
              </div>
              {selectedCovSub && (
                <div className="mt-3 px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/20 text-xs text-left">
                  <p className="font-medium text-accent mb-0.5">Cobertura inter-escolar agendada</p>
                  <p className="text-muted-foreground">
                    {selectedCovSub.name} ({SCHOOLS.find((s) => s.id === selectedCovSub.schoolId)?.name}) cobre de {start} {startTime} a {end} {endTime}.
                  </p>
                </div>
              )}
              <button onClick={onClose} className="mt-5 px-6 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                Fechar
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Assistant — pre-filled, read-only */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary font-mono">{assistant?.initials ?? "?"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{assistantName}</p>
                  <p className="text-[10px] text-muted-foreground">{SCHOOLS.find((s) => s.id === assistant?.schoolId)?.name ?? "Assistente"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Data de início *</label>
                  <DatePicker value={start} onChange={setStart} className="w-full" />
                  <TimePicker value={startTime} onChange={setStartTime} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Data de fim *</label>
                  <DatePicker value={end} onChange={setEnd} className="w-full" />
                  <TimePicker value={endTime} onChange={setEndTime} className="w-full" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Motivo</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                  {["Doença", "Baixa Médica", "Consulta Médica", "Motivo Pessoal", "Acidente", "Luto", "Outro"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Notas</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Observações opcionais..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none placeholder:text-muted-foreground/50" />
              </div>

              {/* ── Inter-school coverage (planned) ── */}
              <div className={`rounded-xl border transition-colors ${showCoverage ? "border-accent/30 bg-accent/3" : "border-border"}`}>
                <button
                  onClick={() => setShowCoverage((v) => !v)}
                  disabled={!hasDates}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-left disabled:opacity-40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${showCoverage ? "bg-accent/15" : "bg-muted"}`}>
                      <Building2 size={12} className={showCoverage ? "text-accent" : "text-muted-foreground"} />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${showCoverage ? "text-accent" : "text-foreground"}`}>Designar cobertura de outra escola</p>
                      {!hasDates && <p className="text-[10px] text-muted-foreground">Preenche as datas primeiro</p>}
                    </div>
                  </div>
                  <ChevronDown size={13} className={`text-muted-foreground transition-transform ${showCoverage ? "rotate-180" : ""}`} />
                </button>

                {showCoverage && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/50 pt-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Escola de origem</label>
                      <select
                        value={coverageSchool}
                        onChange={(e) => { setCoverageSchool(e.target.value === "" ? "" : Number(e.target.value)); setCoverageAssistantId(""); }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Selecionar escola...</option>
                        {otherSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    {coverageSchool !== "" && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">
                          Assistente disponível ({coverageSubstitutes.length})
                        </label>
                        {coverageSubstitutes.length === 0 ? (
                          <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">Nenhum assistente marcado como disponível nesta escola.</p>
                        ) : (
                          <select
                            value={coverageAssistantId}
                            onChange={(e) => setCoverageAssistantId(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Selecionar assistente...</option>
                            {coverageSubstitutes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        )}
                      </div>
                    )}

                    {selectedCovSub && (
                      <div className="bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedCovSub.name}</span> ficará designado nesta escola de <span className="font-mono">{start}</span> a <span className="font-mono">{end}</span>.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={submit} disabled={!hasDates} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                  Registar Ausência
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner() {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border border-[#C8291A]/20 bg-[#FEF2F2] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C8291A]/10 flex items-center justify-center">
          <AlertTriangle size={16} className="text-[#C8291A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#7F1D1D]">
            2 Alertas de Cobertura Insuficiente — Hoje, 27 Jan 2026
          </p>
          <p className="text-xs text-[#C8291A] mt-0.5">
            Nível mínimo de segurança não garantido em dois intervalos críticos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C8291A] text-white text-xs font-medium hover:bg-[#A51F14] transition-colors"
          >
            <RefreshCw size={12} />
            Recalcular
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-[#C8291A]/10 text-[#C8291A] transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded hover:bg-[#C8291A]/10 text-[#C8291A] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#C8291A]/10 px-4 py-3 space-y-2">
          {[
            { time: "08:00 – 09:00", count: 2, min: 3, day: "Hoje" },
            { time: "20:00 – 21:00", count: 1, min: 2, day: "Hoje" },
          ].map((alert, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-[#C8291A] font-medium w-28">{alert.time}</span>
              <span className="text-[#7F1D1D]">
                Apenas <strong>{alert.count}</strong> assistentes presentes (mínimo exigido: <strong>{alert.min}</strong>)
              </span>
              <Badge variant="danger">{alert.day}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Matrix Grid ──────────────────────────────────────────────────────────────

const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => i.toString().padStart(2, "0") + "h");

function MatrixGrid({
  onSelectAssistant,
  matrix,
  dateLabel,
}: {
  onSelectAssistant?: (id: number) => void;
  matrix?: Record<number, BlockState[]>;
  dateLabel?: string;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ aid: number; slot: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [localMatrix, setLocalMatrix] = useState<Record<number, BlockState[]>>(() => {
    const base = matrix ?? SCHEDULE_MATRIX;
    const clone: Record<number, BlockState[]> = {};
    Object.entries(base).forEach(([k, v]) => { clone[Number(k)] = [...v]; });
    return clone;
  });
  const [paintType, setPaintType] = useState<BlockState>("work");
  const [isPainting, setIsPainting] = useState(false);
  const [paintAid, setPaintAid] = useState<number | null>(null);

  const effectiveMatrix = editMode ? localMatrix : (matrix ?? SCHEDULE_MATRIX);

  useEffect(() => {
    const stop = () => { setIsPainting(false); setPaintAid(null); };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function paintSlot(aid: number, slot: number) {
    setLocalMatrix((prev) => {
      const next = { ...prev, [aid]: [...prev[aid]] };
      next[aid][slot] = paintType;
      return next;
    });
  }

  const EDIT_TYPES: BlockState[] = ["work", "surveillance", "cleaning", "collection", "delivery", "lunch", "off"];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Matriz Diária</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{dateLabel ?? "Segunda-feira, 27 Jan 2026"}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(["work", "surveillance", "cleaning", "collection", "delivery", "lunch", "absent"] as BlockState[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg} flex items-center justify-center`}>
                {BLOCK_STYLES[s].locked && <Lock size={6} className="text-white/70" />}
              </div>
              <span className="text-xs text-muted-foreground">{BLOCK_STYLES[s].label}</span>
            </div>
          ))}
          <button
            onClick={() => { setEditMode((v) => !v); setIsPainting(false); setPaintAid(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              editMode ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
            }`}
          >
            <Edit2 size={11} />
            {editMode ? "Sair da Edição" : "Editar Escala"}
          </button>
        </div>
      </div>

      {/* Edit mode activity picker toolbar */}
      {editMode && (
        <div className="px-4 py-2.5 bg-accent/5 border-b border-accent/20 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-accent flex-shrink-0">Pintar com:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {EDIT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setPaintType(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  paintType === type
                    ? "ring-2 ring-accent ring-offset-1 border-transparent " + BLOCK_STYLES[type].bg + " text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-accent/40"
                }`}
              >
                {type !== "off" && (
                  <div className={`w-2.5 h-2.5 rounded-sm ${paintType === type ? "bg-white/20" : BLOCK_STYLES[type].bg}`} />
                )}
                {BLOCK_STYLES[type].label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-accent/60 ml-auto hidden sm:block">Clica ou arrasta para pintar blocos de 15 min</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Hour header — 06h to 20h (15 columns of 4 slots) */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="w-36 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium border-r border-border">
              Assistente
            </div>
            <div className="flex flex-1">
              {HOUR_LABELS.slice(6, 21).map((h, i) => (
                <div
                  key={i}
                  className="flex-none border-r border-border/50 text-center"
                  style={{ width: `calc(100% / 15)` }}
                >
                  <span className="text-[10px] font-mono text-muted-foreground px-1 py-1 block">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {ASSISTANTS.map((assistant) => (
            <div key={assistant.id} className="flex border-b border-border/50 hover:bg-muted/20 transition-colors group">
              <button
                className="w-36 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-accent/5 transition-colors group/name text-left"
                onClick={() => !editMode && onSelectAssistant?.(assistant.id)}
                title={editMode ? undefined : `Ver horário de ${assistant.name}`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 group-hover/name:bg-accent/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="text-[9px] font-bold text-primary font-mono">{assistant.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground group-hover/name:text-accent truncate transition-colors">{assistant.name.split(" ")[0]}</p>
                  {assistant.exception && (
                    <p className="text-[9px] text-[#D97706] truncate">{assistant.exception}</p>
                  )}
                </div>
              </button>

              {editMode ? (
                /* Individual 15-min slots for painting */
                <div className="relative flex-1 h-9 bg-muted/20 flex select-none" onMouseLeave={() => setHoveredCell(null)}>
                  {Array.from({ length: VIEW_SLOTS }, (_, i) => {
                    const slot = VIEW_START + i;
                    const state = effectiveMatrix[assistant.id][slot];
                    const isHourBoundary = i % 4 === 0;
                    return (
                      <div
                        key={slot}
                        className={`flex-none h-full ${isHourBoundary ? "border-l border-border/40" : "border-l border-white/5"} ${
                          state !== "off" ? BLOCK_STYLES[state].bg + " opacity-90" : "bg-transparent hover:bg-white/5"
                        } cursor-crosshair`}
                        style={{ width: `${(1 / VIEW_SLOTS) * 100}%` }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsPainting(true);
                          setPaintAid(assistant.id);
                          paintSlot(assistant.id, slot);
                        }}
                        onMouseEnter={() => {
                          setHoveredCell({ aid: assistant.id, slot });
                          if (isPainting && paintAid === assistant.id) paintSlot(assistant.id, slot);
                        }}
                        title={`${TIME_SLOTS[slot]} · ${BLOCK_STYLES[state].label}`}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Merged view-mode blocks clipped to VIEW window */
                <div className="relative flex-1 h-9 bg-muted/20">
                  {slotsToBlocks(effectiveMatrix[assistant.id]).map((b, bi) => {
                    const clipStart = Math.max(b.start, VIEW_START);
                    const clipEnd   = Math.min(b.start + b.count, VIEW_END);
                    if (b.state === "off" || clipEnd <= clipStart) return null;
                    return (
                      <div
                        key={bi}
                        className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-85 hover:opacity-100 overflow-hidden cursor-default transition-opacity`}
                        style={{
                          left:  `${((clipStart - VIEW_START) / VIEW_SLOTS) * 100}%`,
                          width: `${((clipEnd   - clipStart)  / VIEW_SLOTS) * 100}%`,
                        }}
                        onMouseEnter={() => setHoveredCell({ aid: assistant.id, slot: b.start })}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${assistant.name} · ${TIME_SLOTS[b.start]}–${TIME_SLOTS[Math.min(b.start + b.count, 95)]} · ${BLOCK_STYLES[b.state].label}`}
                      >
                        {BLOCK_STYLES[b.state].locked && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Lock size={9} className="text-white/60" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {ASSISTANTS.find((a) => a.id === hoveredCell.aid)?.name} ·{" "}
            {TIME_SLOTS[hoveredCell.slot]} ·{" "}
            <span className="font-medium text-foreground">
              {BLOCK_STYLES[effectiveMatrix[hoveredCell.aid][hoveredCell.slot]].label}
            </span>
            {editMode && paintAid === hoveredCell.aid && isPainting && (
              <span className="text-accent ml-2">a pintar…</span>
            )}
          </span>
        </div>
      )}
    </Card>
  );
}

// ─── Activity Types Management ────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366F1", "#A855F7", "#EC4899", "#EF4444", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#F97316", "#14B8A6", "#22C55E",
  "#E11D48", "#7C3AED", "#0EA5E9", "#64748B", "#84CC16", "#1A56DB",
];

interface ActivityType {
  id: string;
  label: string;
  color: string;
  builtIn: boolean;
}

const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  { id: "work",         label: "Trabalho",     color: "#6366F1", builtIn: true },
  { id: "surveillance", label: "Vigilância",   color: "#A855F7", builtIn: true },
  { id: "cleaning",     label: "Limpeza",      color: "#06B6D4", builtIn: true },
  { id: "collection",   label: "Recolha",      color: "#EC4899", builtIn: true },
  { id: "delivery",     label: "Entrega",      color: "#10B981", builtIn: true },
  { id: "lunch",        label: "Pausa Almoço", color: "#F59E0B", builtIn: true },
  { id: "absent",       label: "Ausente",      color: "#EF4444", builtIn: true },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md border border-border flex-shrink-0" style={{ backgroundColor: value }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs font-mono rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="#000000"
          maxLength={7}
        />
        <input
          type="color"
          value={value.startsWith("#") && value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded cursor-pointer border border-border p-0.5 bg-card"
          title="Cor personalizada"
        />
      </div>
    </div>
  );
}

function ActivityTypesTab() {
  const [types, setTypes] = useState<ActivityType[]>(DEFAULT_ACTIVITY_TYPES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("#1A56DB");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6366F1");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function startEdit(t: ActivityType) {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditColor(t.color);
    setShowAdd(false);
  }

  function saveEdit() {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? { ...t, label: editLabel.trim() || t.label, color: editColor }
          : t
      )
    );
    setEditingId(null);
  }

  function addType() {
    if (!newLabel.trim()) return;
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now().toString(36);
    setTypes((prev) => [...prev, { id, label: newLabel.trim(), color: newColor, builtIn: false }]);
    setNewLabel(""); setNewColor("#6366F1"); setShowAdd(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tipos de Atividade</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define os blocos disponíveis na edição de escalas — nome, cor e regras de bloqueio.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors flex-shrink-0"
        >
          <Plus size={12} /> Novo Tipo
        </button>
      </div>

      {/* Type list */}
      <Card className="overflow-hidden">
        {types.map((t, idx) => {
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} className={idx > 0 ? "border-t border-border" : ""}>
              {isEditing ? (
                /* ── Edit form ── */
                <div className="p-4 bg-accent/5 border-l-[3px] border-accent space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Nome</label>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Nome do tipo"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Pré-visualização</label>
                      <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-card">
                        <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: editColor }} />
                        <span className="text-sm font-medium truncate">{editLabel || t.label}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-2">Cor</label>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
                    >
                      <Save size={11} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Row ── */
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                  {/* Color badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: t.color + "22" }}
                  >
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: t.color }} />
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{t.label}</span>
                      {t.builtIn && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground">nativo</span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{t.color}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    {!t.builtIn && (
                      deleteId === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Eliminar?</span>
                          <button
                            onClick={() => { setTypes((prev) => prev.filter((x) => x.id !== t.id)); setDeleteId(null); }}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-2 py-1 rounded text-[10px] border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Create modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setShowAdd(false); setNewLabel(""); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Novo Tipo de Atividade</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Define nome e cor do tipo de bloco</p>
                </div>
                <button
                  onClick={() => { setShowAdd(false); setNewLabel(""); }}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <X size={15} className="text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Nome *</label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addType()}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Ex: Apoio Refeitório"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Pré-visualização</label>
                    <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-muted/30">
                      <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: newColor }} />
                      <span className="text-sm font-medium truncate">{newLabel || "Novo tipo"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Cor</label>
                  <ColorPicker value={newColor} onChange={setNewColor} />
                </div>

              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border flex gap-3 justify-end">
                <button
                  onClick={() => { setShowAdd(false); setNewLabel(""); }}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addType}
                  disabled={!newLabel.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  <Save size={13} /> Criar Tipo
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border">
        <Info size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          As alterações são refletidas imediatamente na edição de escalas e nos filtros de substituição inter-escolar.
          Os tipos <strong>nativos</strong> não podem ser eliminados, mas o nome, cor e bloqueio podem ser editados.
        </p>
      </div>
    </div>
  );
}

// ─── Config Engine ────────────────────────────────────────────────────────────

function ConfigEngine() {
  const [activeTab, setActiveTab] = useState<ConfigTab>("security");

  const tabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
    { id: "security",       label: "Regras de Horário",   icon: <Shield size={14} /> },
    { id: "windows",        label: "Funcionamento",       icon: <Clock size={14} /> },
    { id: "holidays",       label: "Feriados",            icon: <Umbrella size={14} /> },
    { id: "activity-types", label: "Tipos de Atividade",  icon: <Layers size={14} /> },
  ];

  return (
    <div>
      <SectionHeader title="Motor de Configurações" subtitle="Gestão de regras com histórico de vigências" />

      <div className="flex gap-px border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "security" && <ScheduleRulesTab />}
      {activeTab === "windows" && <WindowsTab />}
      {activeTab === "holidays" && <FeriadosPage />}
      {activeTab === "activity-types" && <ActivityTypesTab />}
    </div>
  );
}

function RuleTable({
  columns,
  rows,
  onAdd,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  onAdd: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {col}
                </th>
              ))}
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-sm text-foreground">
                    {cell}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          <Plus size={14} />
          Adicionar regra
        </button>
      </div>
    </Card>
  );
}

function ScheduleRulesTab() {
  type ScheduleRule = {
    id: number;
    activityTypeId: string;
    periodStart: string;
    periodEnd: string;
    min: number;
    type: "mandatory" | "optional";
    start: string;
    end: string | null;
    assistantIds: number[];
  };

  const allAssistantIds = ASSISTANTS.map((a) => a.id);
  const [rules, setRules] = useState<ScheduleRule[]>([
    { id: 1, activityTypeId: "work",         periodStart: "07:30", periodEnd: "13:00", min: 3, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: allAssistantIds },
    { id: 2, activityTypeId: "work",         periodStart: "13:00", periodEnd: "20:00", min: 4, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: allAssistantIds },
    { id: 3, activityTypeId: "surveillance", periodStart: "20:00", periodEnd: "22:00", min: 2, type: "optional",  start: "01 Jan 2026", end: null, assistantIds: [1, 3, 6] },
    { id: 4, activityTypeId: "collection",   periodStart: "07:30", periodEnd: "09:00", min: 1, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: [3, 6] },
    { id: 5, activityTypeId: "work",         periodStart: "07:30", periodEnd: "13:00", min: 2, type: "mandatory", start: "01 Set 2025", end: "31 Dez 2025", assistantIds: allAssistantIds },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state (shared between add and edit)
  const [fActivity, setFActivity]       = useState("");
  const [fStart, setFStart]             = useState("07:30");
  const [fEnd, setFEnd]                 = useState("13:00");
  const [fMin, setFMin]                 = useState("3");
  const [fType, setFType]               = useState<"mandatory" | "optional">("mandatory");
  const [fVigStart, setFVigStart]       = useState("2026-02-01");
  const [fVigEnd, setFVigEnd]           = useState("");
  const [fAssistants, setFAssistants]   = useState<number[]>([]);
  const [fStep, setFStep]               = useState<"form" | "conflict" | "done">("form");

  const allSelected = fAssistants.length === ASSISTANTS.length;
  function toggleAssistant(id: number) {
    setFAssistants((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    setFAssistants(allSelected ? [] : ASSISTANTS.map((a) => a.id));
  }

  const isEditing = editingRuleId !== null;
  const selectedActivity = DEFAULT_ACTIVITY_TYPES.find((a) => a.id === fActivity);
  const conflictingRule = !isEditing
    ? rules.find((r) => r.activityTypeId === fActivity && r.periodStart === fStart && r.end === null)
    : null;

  function openAdd() {
    setEditingRuleId(null);
    setFActivity(""); setFStart("07:30"); setFEnd("13:00");
    setFMin("3"); setFType("mandatory"); setFVigStart("2026-02-01"); setFVigEnd("");
    setFAssistants(ASSISTANTS.map((a) => a.id));
    setFStep("form"); setShowAdd(true);
  }

  function openEdit(rule: ScheduleRule) {
    setEditingRuleId(rule.id);
    setFActivity(rule.activityTypeId);
    setFStart(rule.periodStart); setFEnd(rule.periodEnd);
    setFMin(String(rule.min)); setFType(rule.type);
    setFVigStart(rule.start.split(" ").reverse().join("-"));
    setFVigEnd(rule.end ?? "");
    setFAssistants(rule.assistantIds);
    setFStep("form"); setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false); setEditingRuleId(null); setFStep("form");
  }

  function submitRule() {
    if (!isEditing && conflictingRule) { setFStep("conflict"); return; }
    if (isEditing) {
      setRules((prev) => prev.map((r) =>
        r.id === editingRuleId
          ? { ...r, activityTypeId: fActivity, periodStart: fStart, periodEnd: fEnd, min: Number(fMin), type: fType, end: fVigEnd || null, assistantIds: fAssistants }
          : r
      ));
      setFStep("done");
    } else {
      confirmCreate();
    }
  }

  function confirmCreate() {
    setRules((prev) => [
      ...prev,
      { id: Date.now(), activityTypeId: fActivity, periodStart: fStart, periodEnd: fEnd, min: Number(fMin), type: fType, start: fVigStart, end: fVigEnd || null, assistantIds: fAssistants },
    ]);
    setFStep("done");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Regras de Horário</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Define que atividade é obrigatória, em que período e com quantas pessoas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={12} /> Adicionar Regra
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeAdd} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto">
              {/* Modal header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {fStep === "form" ? (isEditing ? "Editar Regra de Horário" : "Nova Regra de Horário") : fStep === "conflict" ? "Sobreposição detectada" : (isEditing ? "Regra atualizada" : "Regra criada")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fStep === "form" ? "Define atividade, período e mínimo de pessoas" : fStep === "conflict" ? "Já existe uma regra ativa para esta combinação" : (isEditing ? "As alterações foram guardadas com sucesso" : "A regra foi adicionada com sucesso")}
                  </p>
                </div>
                <button onClick={closeAdd} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
              </div>

              {/* Step: form */}
              {fStep === "form" && (
                <div className="p-5 space-y-4">
                  {/* Activity selectbox */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Atividade *</label>
                    <div className="relative">
                      <select
                        value={fActivity}
                        onChange={(e) => setFActivity(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
                      >
                        <option value="">Selecionar atividade...</option>
                        {DEFAULT_ACTIVITY_TYPES.filter((a) => a.id !== "absent" && a.id !== "off").map((a) => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                      {selectedActivity && (
                        <div
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-sm pointer-events-none"
                          style={{ backgroundColor: selectedActivity.color }}
                        />
                      )}
                      {!selectedActivity && (
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-sm bg-muted pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {/* Period */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Período</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Início</label>
                        <TimePicker value={fStart} onChange={setFStart} className="w-full" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Fim</label>
                        <TimePicker value={fEnd} onChange={setFEnd} className="w-full" />
                      </div>
                    </div>
                  </div>

                  {/* Min + type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Mínimo de pessoas *</label>
                      <input type="number" value={fMin} onChange={(e) => setFMin(e.target.value)} min={1} max={20}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Obrigatoriedade</label>
                      <select value={fType} onChange={(e) => setFType(e.target.value as "mandatory" | "optional")}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="mandatory">Obrigatório</option>
                        <option value="optional">Facultativo</option>
                      </select>
                    </div>
                  </div>

                  {/* Assistants picker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Funcionários habilitados</label>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          allSelected ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {allSelected ? <Check size={11} /> : <Plus size={11} />}
                        {allSelected ? "Todos selecionados" : "Selecionar todos"}
                      </button>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      {ASSISTANTS.map((a, idx) => {
                        const selected = fAssistants.includes(a.id);
                        return (
                          <label
                            key={a.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${idx > 0 ? "border-t border-border/50" : ""} ${selected ? "bg-accent/5" : "hover:bg-muted/30"}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleAssistant(a.id)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${selected ? "bg-accent border-accent" : "border-border"}`}>
                              {selected && <Check size={10} className="text-white" />}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-bold text-primary font-mono">{a.initials}</span>
                            </div>
                            <span className={`text-xs flex-1 ${selected ? "font-medium text-foreground" : "text-muted-foreground"}`}>{a.name}</span>
                            {a.exception && (
                              <span className="text-[9px] text-[#D97706] truncate max-w-24">{a.exception}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {fAssistants.length} de {ASSISTANTS.length} funcionários habilitados
                    </p>
                  </div>

                  {/* Vigência */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Início de vigência *</label>
                      <DatePicker value={fVigStart} onChange={setFVigStart} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Fim de vigência</label>
                      <DatePicker value={fVigEnd} onChange={setFVigEnd} className="w-full" />
                      <p className="text-[10px] text-muted-foreground mt-1">Em branco = vigência em aberto</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={submitRule}
                      disabled={!fActivity || !fMin}
                      className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors"
                    >
                      {isEditing ? "Guardar Alterações" : "Criar Regra"}
                    </button>
                    <button onClick={closeAdd} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Step: conflict */}
              {fStep === "conflict" && (
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF9EC] border border-[#D97706]/20">
                    <AlertTriangle size={15} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">Sobreposição de vigências detectada</p>
                      <p className="text-xs text-muted-foreground mb-2">Já existe uma regra em aberto para esta atividade e período:</p>
                      {conflictingRule && (
                        <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: DEFAULT_ACTIVITY_TYPES.find((a) => a.id === conflictingRule.activityTypeId)?.color }} />
                          <span className="text-xs font-medium text-foreground">
                            {DEFAULT_ACTIVITY_TYPES.find((a) => a.id === conflictingRule.activityTypeId)?.label}
                          </span>
                          <span className="text-xs text-muted-foreground">· {conflictingRule.periodStart}–{conflictingRule.periodEnd} · min {conflictingRule.min} · desde {conflictingRule.start}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground">Pretende fechar a regra anterior em <strong>{fVigStart}</strong> e criar a nova?</p>
                  <div className="flex gap-3">
                    <button onClick={confirmCreate} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                      Fechar anterior e criar nova
                    </button>
                    <button onClick={() => setFStep("form")} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {/* Step: done */}
              {fStep === "done" && (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
                    <CheckCircle size={24} className="text-[#0E7C59]" />
                  </div>
                  <p className="font-semibold text-foreground">Regra Criada</p>
                  <p className="text-sm text-muted-foreground">A regra de horário foi adicionada com sucesso.</p>
                  <button onClick={closeAdd} className="mt-2 px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rules table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Atividade", "Período", "Mín. pessoas", "Funcionários", "Obrigatoriedade", "Vigência início", "Vigência fim", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const activity = DEFAULT_ACTIVITY_TYPES.find((a) => a.id === rule.activityTypeId);
                return (
                  <tr key={rule.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${rule.end ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: activity?.color ?? "#ccc" }} />
                        <span className="font-medium text-foreground">{activity?.label ?? rule.activityTypeId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{rule.periodStart}–{rule.periodEnd}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{rule.min}</td>
                    <td className="px-4 py-3">
                      {rule.assistantIds.length === ASSISTANTS.length ? (
                        <span className="text-xs text-muted-foreground">Todos ({ASSISTANTS.length})</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {rule.assistantIds.slice(0, 3).map((aid) => {
                            const a = ASSISTANTS.find((x) => x.id === aid);
                            return a ? (
                              <span key={aid} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[8px] font-bold text-primary font-mono" title={a.name}>{a.initials}</span>
                            ) : null;
                          })}
                          {rule.assistantIds.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{rule.assistantIds.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rule.type === "mandatory" ? <Badge variant="danger">Obrigatório</Badge> : <Badge variant="muted">Facultativo</Badge>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{rule.start}</td>
                    <td className="px-4 py-3 font-mono text-xs">{rule.end ?? <span className="text-[#0E7C59] font-semibold">Em aberto</span>}</td>
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === rule.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-[#C8291A]">Confirmar?</span>
                          <button onClick={() => { setRules((p) => p.filter((r) => r.id !== rule.id)); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-destructive text-white">Sim</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs border border-border text-muted-foreground">Não</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setDeleteConfirm(null); openEdit(rule); }}
                            className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                            title="Editar regra"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Eliminar regra"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StaffingTab() {
  const [records, setRecords] = useState([
    { id: 1, capacity: 14, start: "01 Set 2025", end: "31 Dez 2025" },
    { id: 2, capacity: 12, start: "01 Jan 2026", end: null as string | null },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formCapacity, setFormCapacity] = useState("12");
  const [formStart, setFormStart] = useState("2026-02-01");
  const [formEnd, setFormEnd] = useState("");
  const [overlapWarn, setOverlapWarn] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openAdd() { setFormCapacity("12"); setFormStart("2026-02-01"); setFormEnd(""); setEditId(null); setOverlapWarn(false); setShowForm(true); }
  function openEdit(r: typeof records[0]) { setFormCapacity(String(r.capacity)); setFormStart("2026-02-01"); setFormEnd(""); setEditId(r.id); setOverlapWarn(false); setShowForm(true); }

  function handleSave() {
    const hasOpen = records.some((r) => r.end === null && (editId ? r.id !== editId : true));
    if (hasOpen) { setOverlapWarn(true); return; }
    if (editId) {
      setRecords((p) => p.map((r) => r.id === editId ? { ...r, capacity: Number(formCapacity) } : r));
    } else {
      setRecords((p) => [...p, { id: p.length + 1, capacity: Number(formCapacity), start: formStart, end: formEnd || null }]);
    }
    setShowForm(false); setEditId(null);
  }

  function forceClose() {
    setRecords((p) => p.map((r) => r.end === null ? { ...r, end: formStart } : r));
    setOverlapWarn(false);
    setRecords((p) => [...p, { id: p.length + 1, capacity: Number(formCapacity), start: formStart, end: formEnd || null }]);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Lotação da Equipa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Número máximo de assistentes na equipa por período</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90">
          <Plus size={12} />Adicionar
        </button>
      </div>

      {showForm && (
        <Modal title={editId ? "Editar Lotação" : "Nova Lotação"} subtitle="Define o número máximo de assistentes activos" onClose={() => setShowForm(false)}>
          {overlapWarn ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FEF9EC] border border-[#D97706]/20">
                <AlertTriangle size={14} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">Sobreposição detectada</p>
                  <p className="text-xs text-muted-foreground">Existe uma lotação em aberto. Pretende fechá-la com a data de início desta nova ({formStart}) e criar a nova?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={forceClose} className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium">Fechar anterior e criar nova</button>
                <button onClick={() => setOverlapWarn(false)} className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Lotação *</label>
                  <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} min={1} max={50}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Início Vigência *</label>
                  <DatePicker value={formStart} onChange={setFormStart} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Fim Vigência</label>
                  <DatePicker value={formEnd} onChange={setFormEnd} className="w-full" />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90">Guardar</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Lotação", "Início", "Fim", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${r.end ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-mono text-lg font-bold text-foreground">{r.capacity}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.start}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.end ?? <span className="text-[#0E7C59] font-semibold">Em aberto</span>}</td>
                  <td className="px-4 py-3">{r.end ? <Badge variant="muted">Encerrada</Badge> : <Badge variant="success">Em vigor</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Edit2 size={13} /></button>
                      {deleteConfirm === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#C8291A]">Confirmar?</span>
                          <button onClick={() => { setRecords((p) => p.filter((x) => x.id !== r.id)); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-destructive text-white">Sim</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs border border-border text-muted-foreground">Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><X size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WindowsTab() {
  const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const [windows, setWindows] = useState([
    { id: 1, days: [true, true, true, true, true, false, false], open: "07:30", close: "21:00", start: "01 Jan 2026", end: null as string | null },
    { id: 2, days: [false, false, false, false, false, true, false], open: "09:00", close: "18:00", start: "01 Jan 2026", end: null as string | null },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formDays, setFormDays] = useState([true, true, true, true, true, false, false]);
  const [formOpen, setFormOpen] = useState("07:30");
  const [formClose, setFormClose] = useState("21:00");
  const [formStart, setFormStart] = useState("2026-02-01");
  const [formEnd, setFormEnd] = useState("");
  const [formLunchStart, setFormLunchStart] = useState("11:00");
  const [formLunchEnd, setFormLunchEnd] = useState("14:00");
  const [formLunchDuration, setFormLunchDuration] = useState("30");
  const [overlapWarn, setOverlapWarn] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openAdd() { setFormDays([true,true,true,true,true,false,false]); setFormOpen("07:30"); setFormClose("21:00"); setFormStart("2026-02-01"); setFormEnd(""); setFormLunchStart("11:00"); setFormLunchEnd("14:00"); setFormLunchDuration("30"); setEditId(null); setOverlapWarn(false); setShowForm(true); }
  function openEdit(w: typeof windows[0]) { setFormDays([...w.days]); setFormOpen(w.open); setFormClose(w.close); setFormStart("2026-02-01"); setFormEnd(""); setFormLunchStart("11:00"); setFormLunchEnd("14:00"); setFormLunchDuration("30"); setEditId(w.id); setOverlapWarn(false); setShowForm(true); }

  function toggleDay(i: number) { setFormDays((p) => { const n = [...p]; n[i] = !n[i]; return n; }); }

  function handleSave() {
    const overlaps = windows.some((w) => w.end === null && (editId ? w.id !== editId : true) && w.days.some((d, i) => d && formDays[i]));
    if (overlaps) { setOverlapWarn(true); return; }
    if (editId) {
      setWindows((p) => p.map((w) => w.id === editId ? { ...w, days: formDays, open: formOpen, close: formClose } : w));
    } else {
      setWindows((p) => [...p, { id: Date.now(), days: formDays, open: formOpen, close: formClose, start: formStart, end: formEnd || null }]);
    }
    setShowForm(false); setEditId(null);
  }

  function forceClose() {
    setWindows((p) => p.map((w) => (w.end === null && w.days.some((d, i) => d && formDays[i])) ? { ...w, end: formStart } : w));
    setWindows((p) => [...p, { id: Date.now(), days: formDays, open: formOpen, close: formClose, start: formStart, end: formEnd || null }]);
    setOverlapWarn(false); setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Janelas de Funcionamento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Horário de funcionamento do estabelecimento — define quando o motor gera horários</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90">
          <Plus size={12} />Adicionar
        </button>
      </div>

      {showForm && (
        <Modal title={editId ? "Editar Janela" : "Nova Janela de Funcionamento"} subtitle="Horário de abertura e período de almoço" onClose={() => setShowForm(false)} maxWidth="max-w-xl">
          {overlapWarn ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#FEF9EC] border border-[#D97706]/20">
                <AlertTriangle size={14} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">Sobreposição detectada</p>
                  <p className="text-xs text-muted-foreground">Existe uma janela em aberto que cobre os mesmos dias. Pretende fechá-la com data {formStart} e criar esta nova?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={forceClose} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">Fechar anterior e criar nova</button>
                <button onClick={() => setOverlapWarn(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Dias da Semana *</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => toggleDay(i)} type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${formDays[i] ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Abertura</label>
                  <TimePicker value={formOpen} onChange={setFormOpen} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Fecho</label>
                  <TimePicker value={formClose} onChange={setFormClose} className="w-full" />
                </div>
              </div>
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Período de Almoço</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Início possível</label>
                    <TimePicker value={formLunchStart} onChange={setFormLunchStart} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Fim possível</label>
                    <TimePicker value={formLunchEnd} onChange={setFormLunchEnd} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Duração da Pausa</label>
                    <select value={formLunchDuration} onChange={(e) => setFormLunchDuration(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vigência</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Início</label>
                    <DatePicker value={formStart} onChange={setFormStart} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Fim</label>
                    <DatePicker value={formEnd} onChange={setFormEnd} className="w-full" />
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Em branco = vigência em aberto</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90">Guardar</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      <div className="space-y-3">
        {windows.map((w) => (
          <Card key={w.id} className="overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((d, i) => (
                  <span key={d} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${w.days[i] ? "bg-accent/10 text-accent font-semibold" : "bg-muted/40 text-muted-foreground/40"}`}>{d}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                <Clock size={13} className="text-accent" />{w.open} – {w.close}
              </div>
              <div className="text-xs text-muted-foreground flex-1">Vigência: {w.start} — {w.end ?? <span className="text-[#0E7C59] font-semibold">Em aberto</span>}</div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(w)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Edit2 size={13} /></button>
                {deleteConfirm === w.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#C8291A]">Confirmar?</span>
                    <button onClick={() => { setWindows((p) => p.filter((x) => x.id !== w.id)); setDeleteConfirm(null); }} className="px-2 py-1 rounded text-xs bg-destructive text-white">Sim</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs border border-border text-muted-foreground">Não</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(w.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><X size={13} /></button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Assistant Profile ────────────────────────────────────────────────────────

// Generate a weekly schedule variant for a given "week offset" (0 = current week)
function generateWeekSchedule(weekOffset: number): Record<string, BlockState[]> {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const patterns: Record<string, BlockState[]> = {};
  days.forEach((day, di) => {
    const row: BlockState[] = Array(96).fill("off");
    // Weekends off
    if (di >= 5) { patterns[day] = row; return; }
    // Week -1: a sick day on Wednesday
    if (weekOffset === -1 && di === 2) {
      for (let i = 0; i < 96; i++) row[i] = "absent";
      patterns[day] = row;
      return;
    }
    const startSlot = 40; // 10:00
    const endSlot = 68;   // 17:00
    const lunchStart = 52; // 13:00
    const lunchEnd = 56;   // 14:00
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= lunchStart && i < lunchEnd) row[i] = "lunch";
      else row[i] = "work";
    }
    patterns[day] = row;
  });
  return patterns;
}

// Summarise a day's blocks into counts for the monthly mini-bar
function summariseDay(slots: BlockState[]) {
  const counts = { work: 0, surveillance: 0, lunch: 0, absent: 0, off: 0 };
  slots.forEach((s) => counts[s]++);
  return counts;
}

// Week labels for navigation
const WEEK_OFFSETS: Record<number, string> = {
  0: "Semana atual (27 Jan – 02 Fev)",
  "-1": "Semana anterior (20 Jan – 26 Jan)",
  "-2": "Semana de 13 Jan – 19 Jan",
  "-3": "Semana de 06 Jan – 12 Jan",
};

// JAN_2026_OFFSET kept for any legacy reference
const JAN_2026_OFFSET = 3;

function ProfileScheduleHistory() {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthIdx, setMonthIdx] = useState(3); // Jan 2026 = index 3
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const weekData = generateWeekSchedule(weekOffset);
  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekDates: Record<string, string> = {
    "Seg": weekOffset === 0 ? "27 Jan" : weekOffset === -1 ? "20 Jan" : weekOffset === -2 ? "13 Jan" : "06 Jan",
    "Ter": weekOffset === 0 ? "28 Jan" : weekOffset === -1 ? "21 Jan" : weekOffset === -2 ? "14 Jan" : "07 Jan",
    "Qua": weekOffset === 0 ? "29 Jan" : weekOffset === -1 ? "22 Jan" : weekOffset === -2 ? "15 Jan" : "08 Jan",
    "Qui": weekOffset === 0 ? "30 Jan" : weekOffset === -1 ? "23 Jan" : weekOffset === -2 ? "16 Jan" : "09 Jan",
    "Sex": weekOffset === 0 ? "31 Jan" : weekOffset === -1 ? "24 Jan" : weekOffset === -2 ? "17 Jan" : "10 Jan",
    "Sáb": weekOffset === 0 ? "01 Fev" : weekOffset === -1 ? "25 Jan" : weekOffset === -2 ? "18 Jan" : "11 Jan",
    "Dom": weekOffset === 0 ? "02 Fev" : weekOffset === -1 ? "26 Jan" : weekOffset === -2 ? "19 Jan" : "12 Jan",
  };

  const currentMonth = PROFILE_MONTHS[monthIdx];

  // Generate slots for any day of the current month
  function getDaySlots(dayNum: number): BlockState[] {
    const dow = (currentMonth.offset + dayNum - 1) % 7;
    const isWeekend = dow === 0 || dow === 6;
    const row: BlockState[] = Array(96).fill("off");
    if (isWeekend) return row;
    if (currentMonth.sickDay && dayNum === currentMonth.sickDay) { row.fill("absent"); return row; }
    const startSlot = 40; // 10:00
    const endSlot = 68;   // 17:00
    const lunchStart = 52; // 13:00
    const lunchEnd = 56;   // 14:00
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= lunchStart && i < lunchEnd) row[i] = "lunch";
      else row[i] = "work";
    }
    return row;
  }

  const selectedDaySlots = selectedDay ? getDaySlots(selectedDay) : null;

  // Group selected day's slots into contiguous blocks
  function groupSlots(slots: BlockState[]) {
    const groups: { state: BlockState; start: number; end: number }[] = [];
    let cur: { state: BlockState; start: number; end: number } | null = null;
    slots.forEach((s, i) => {
      if (s === "off") { if (cur) { groups.push(cur); cur = null; } return; }
      if (cur && cur.state === s) { cur.end = i; }
      else { if (cur) groups.push(cur); cur = { state: s, start: i, end: i }; }
    });
    if (cur) groups.push(cur);
    return groups;
  }

  // Ticks every 2 hours within the visible 06h–21h window
  const HOUR_TICKS = [24, 32, 40, 48, 56, 64, 72, 80, 84];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => { setViewMode("week"); setSelectedDay(null); }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "week" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Semanal
          </button>
          <button
            onClick={() => { setViewMode("month"); setSelectedDay(null); }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "month" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Mensal
          </button>
        </div>

        {viewMode === "week" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => Math.max(w - 1, -3))}
              disabled={weekOffset <= -3}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-muted-foreground w-52 text-center">
              {WEEK_OFFSETS[weekOffset as keyof typeof WEEK_OFFSETS] ?? ""}
            </span>
            <button
              onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
              disabled={weekOffset >= 0}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {viewMode === "month" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMonthIdx((m) => Math.max(m - 1, 0)); setSelectedDay(null); }}
              disabled={monthIdx === 0}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-muted-foreground w-32 text-center">{currentMonth.label}</span>
            <button
              onClick={() => { setMonthIdx((m) => Math.min(m + 1, PROFILE_MONTHS.length - 1)); setSelectedDay(null); }}
              disabled={monthIdx === PROFILE_MONTHS.length - 1}
              className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── WEEKLY VIEW ── */}
      {viewMode === "week" && (
        <Card className="overflow-hidden">
          {/* Legend */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-4">
            {(["work", "surveillance", "lunch", "absent"] as BlockState[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg}`} />
                <span className="text-[10px] text-muted-foreground">{BLOCK_STYLES[s].label}</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour axis */}
              <div className="flex border-b border-border bg-muted/10">
                <div className="w-20 flex-shrink-0 border-r border-border" />
                <div className="flex-1 relative h-6">
                  {HOUR_TICKS.map((tick) => (
                    <div
                      key={tick}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${((tick - VIEW_START) / VIEW_SLOTS) * 100}%` }}
                    >
                      <span className="text-[9px] font-mono text-muted-foreground px-0.5 leading-6">
                        {Math.floor(tick / 4).toString().padStart(2, "0")}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day rows */}
              {weekDays.map((day) => {
                const slots = weekData[day];
                const isWeekend = day === "Sáb" || day === "Dom";
                const allAbsent = slots.every((s) => s === "absent");
                return (
                  <div key={day} className={`flex border-b border-border/50 ${isWeekend ? "opacity-40" : "hover:bg-muted/10"} transition-colors`}>
                    <div className="w-20 flex-shrink-0 px-3 py-2 border-r border-border flex flex-col justify-center">
                      <span className="text-xs font-semibold text-foreground">{day}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{weekDates[day]}</span>
                    </div>
                    <div className="flex-1 flex h-10 relative">
                      {/* Hour grid lines */}
                      {HOUR_TICKS.map((tick) => (
                        <div
                          key={tick}
                          className="absolute top-0 bottom-0 border-l border-border/30"
                          style={{ left: `${((tick - VIEW_START) / VIEW_SLOTS) * 100}%` }}
                        />
                      ))}
                      {/* Slots clipped to VIEW window */}
                      {slotsToBlocks(slots).map((b) => {
                        const cs = Math.max(b.start, VIEW_START);
                        const ce = Math.min(b.start + b.count, VIEW_END);
                        if (b.state === "off" || ce <= cs) return null;
                        return (
                          <div
                            key={b.start}
                            className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-80 overflow-hidden`}
                            style={{ left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`, width: `${((ce - cs) / VIEW_SLOTS) * 100}%` }}
                            title={`${TIME_SLOTS[b.start]}–${TIME_SLOTS[Math.min(b.start + b.count, 95)]} · ${BLOCK_STYLES[b.state].label}`}
                          >
                            {BLOCK_STYLES[b.state].locked && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Lock size={8} className="text-white/50" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {allAbsent && (
                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                          <span className="text-[10px] text-[#C8291A] font-medium">Ausência registada</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly summary */}
          <div className="px-4 py-3 bg-muted/10 border-t border-border flex items-center gap-6">
            {(() => {
              let totalWork = 0, totalSurv = 0, totalAbsent = 0;
              weekDays.forEach((d) => {
                const s = summariseDay(weekData[d]);
                totalWork += s.work;
                totalSurv += s.surveillance;
                totalAbsent += s.absent;
              });
              const toH = (slots: number) => { const m = slots * 15; return `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}min` : ""}`; };
              return (
                <>
                  <div className="text-xs text-muted-foreground">
                    Trabalho: <span className="font-mono font-medium text-foreground">{toH(totalWork)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vigilância: <span className="font-mono font-medium text-foreground">{toH(totalSurv)}</span>
                  </div>
                  {totalAbsent > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Ausência: <span className="font-mono font-medium text-[#C8291A]">{toH(totalAbsent)}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      )}

      {/* ── MONTHLY VIEW ── */}
      {viewMode === "month" && (
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <Card className="overflow-hidden">
            {/* Calendar header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/20">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <div key={d} className="text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/50 last:border-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid — dynamic month */}
            <div className="grid grid-cols-7">
              {/* Empty cells before day 1 */}
              {Array.from({ length: currentMonth.offset }, (_, i) => (
                <div key={`pre-${i}`} className="border-r border-b border-border/30 h-16 bg-muted/5" />
              ))}

              {Array.from({ length: currentMonth.days }, (_, i) => i + 1).map((day) => {
                const slots = getDaySlots(day);
                const summary = summariseDay(slots);
                const dow = (currentMonth.offset + day - 1) % 7;
                const isWeekend = dow === 0 || dow === 6;
                const isToday = monthIdx === 3 && day === 27; // today = Jan 27
                const isSelected = selectedDay === day;
                const totalActive = summary.work + summary.surveillance + summary.lunch + summary.absent;
                const isSunCol = (currentMonth.offset + day - 1) % 7 === 6;

                return (
                  <button
                    key={day}
                    onClick={() => !isWeekend && setSelectedDay(isSelected ? null : day)}
                    className={`border-r border-b border-border/30 h-16 p-1.5 text-left transition-colors
                      ${isWeekend ? "bg-muted/10 cursor-default" : "hover:bg-accent/5 cursor-pointer"}
                      ${isSelected ? "bg-accent/8 ring-1 ring-inset ring-accent" : ""}
                      ${isSunCol ? "border-r-0" : ""}
                    `}
                  >
                    <div className={`text-xs font-mono mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-accent text-white font-bold" : isWeekend ? "text-muted-foreground/40" : "text-foreground"
                    }`}>
                      {day}
                    </div>
                    {!isWeekend && totalActive > 0 && (
                      <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                        {summary.work > 0 && <div className="bg-[#1A56DB]/75 rounded-sm" style={{ flex: summary.work }} />}
                        {summary.surveillance > 0 && <div className="bg-[#7C3AED]/75 rounded-sm" style={{ flex: summary.surveillance }} />}
                        {summary.lunch > 0 && <div className="bg-[#D97706]/75 rounded-sm" style={{ flex: summary.lunch }} />}
                        {summary.absent > 0 && <div className="bg-[#C8291A]/75 rounded-sm" style={{ flex: summary.absent }} />}
                      </div>
                    )}
                    {!isWeekend && summary.absent > 0 && summary.work === 0 && (
                      <span className="text-[9px] text-[#C8291A] block leading-tight mt-0.5">ausência</span>
                    )}
                    {!isWeekend && totalActive > 0 && summary.work > 0 && (
                      <span className="text-[9px] text-muted-foreground block leading-tight mt-0.5 font-mono">
                        {Math.floor((summary.work + summary.surveillance + summary.lunch) / 2)}h
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Fill trailing cells */}
              {(() => {
                const totalCells = currentMonth.offset + currentMonth.days;
                const remainder = totalCells % 7;
                if (remainder === 0) return null;
                return Array.from({ length: 7 - remainder }, (_, i) => (
                  <div key={`post-${i}`} className="border-b border-border/30 h-16 bg-muted/5" />
                ));
              })()}
            </div>
          </Card>

          {/* Day detail panel */}
          <div>
            {!selectedDay ? (
              <Card className="h-full flex flex-col items-center justify-center p-6 text-center">
                <Calendar size={28} className="text-muted-foreground/25 mb-2" />
                <p className="text-sm text-muted-foreground">Clique num dia para ver o detalhe do horário</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedDay} de {currentMonth.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][(currentMonth.offset + selectedDay - 1) % 7]}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1 rounded hover:bg-muted transition-colors">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto max-h-80">
                  {selectedDaySlots && groupSlots(selectedDaySlots).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Dia de folga</p>
                  ) : (
                    selectedDaySlots && groupSlots(selectedDaySlots).map((block, i) => {
                      const startTime = TIME_SLOTS[block.start];
                      const endTime = TIME_SLOTS[block.end + 1] || "24:00";
                      const durationMin = (block.end - block.start + 1) * 15;
                      const durationStr = durationMin >= 60
                        ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ""}`
                        : `${durationMin}min`;

                      const colorMap: Record<BlockState, string> = {
                        work: "border-l-[#1A56DB] bg-[#1A56DB]/5",
                        surveillance: "border-l-[#7C3AED] bg-[#7C3AED]/5",
                        lunch: "border-l-[#D97706] bg-[#D97706]/5",
                        absent: "border-l-[#C8291A] bg-[#C8291A]/5",
                        off: "border-l-border bg-muted/20",
                      };
                      const textMap: Record<BlockState, string> = {
                        work: "text-[#1A56DB]",
                        surveillance: "text-[#7C3AED]",
                        lunch: "text-[#D97706]",
                        absent: "text-[#C8291A]",
                        off: "text-muted-foreground",
                      };

                      return (
                        <div key={i} className={`border-l-4 rounded-r-lg px-3 py-2 ${colorMap[block.state]}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${textMap[block.state]}`}>
                              {BLOCK_STYLES[block.state].label}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">{durationStr}</span>
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {startTime} – {endTime}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Day summary */}
                {selectedDaySlots && (() => {
                  const s = summariseDay(selectedDaySlots);
                  const toH = (n: number) => `${Math.floor(n / 2)}h${n % 2 ? "30" : ""}`;
                  return (
                    <div className="px-4 py-3 border-t border-border bg-muted/10 grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Trabalho + Vigilância</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{toH(s.work + s.surveillance)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Pausa Almoço</p>
                        <p className="text-sm font-mono font-semibold text-foreground">{toH(s.lunch)}</p>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantProfile({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
  const [showAddException, setShowAddException] = useState(false);
  const [editing, setEditing] = useState(false);
  const [availableForTransfer, setAvailableForTransfer] = useState(false);

  if (editing) {
    return (
      <AddEditAssistant
        isEdit
        onSave={() => setEditing(false)}
        onCancel={() => setEditing(false)}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft size={15} />Voltar à lista
        </button>
      )}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary font-mono">ER</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ana Costa</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="success">Ativo</Badge>
              <Badge variant="warning">Licença Amamentação</Badge>
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Edit2 size={13} />
          Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {([
          { id: "info", label: "Dados & Exceções", icon: <User size={13} /> },
          { id: "history", label: "Histórico de Horários", icon: <Calendar size={13} /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Dados & Exceções tab ── */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Card className="p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Pessoais</h4>
              <div className="space-y-3">
                {[
                  { label: "Nº Mecanográfico", value: "ME-00127" },
                  { label: "Email", value: "e.rodrigues@sgde.pt" },
                  { label: "Telefone", value: "+351 912 345 678" },
                  { label: "Admissão", value: "14/03/2019" },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between">
                    <span className="text-muted-foreground text-xs">{f.label}</span>
                    <span className="font-mono text-xs font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Carga Horária Atual</h4>
              <div className="text-center">
                <span className="text-3xl font-mono font-bold text-accent">6h</span>
                <p className="text-xs text-muted-foreground mt-1">por dia · regime reduzido</p>
                <p className="text-[10px] text-[#D97706] mt-1 font-mono">Licença Amamentação (vigente)</p>
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-medium">10:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Saída</span>
                  <span className="font-mono font-medium">17:00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pausa almoço</span>
                  <span className="font-mono font-medium">13:00 – 14:00</span>
                </div>
              </div>
            </Card>

            {/* Inter-school availability card */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${availableForTransfer ? "bg-accent/10" : "bg-muted"}`}>
                    <Building2 size={14} className={availableForTransfer ? "text-accent" : "text-muted-foreground"} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Disponibilidade Inter-escolar</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      {availableForTransfer
                        ? "Pode ser convocado para cobrir noutras escolas do agrupamento."
                        : "Não disponível para transferência temporária."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAvailableForTransfer((v) => !v)}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${availableForTransfer ? "bg-accent" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${availableForTransfer ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {availableForTransfer && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Info size={10} className="text-accent" />
                    Ficará visível na lista de substitutos quando houver falhas de cobertura noutras escolas.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Regras de Exceção e Vigências</h3>
              <button
                onClick={() => setShowAddException(!showAddException)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
              >
                <Plus size={12} />
                Nova Exceção
              </button>
            </div>

            {showAddException && (
              <Modal title="Adicionar Regra de Exceção" subtitle="Horário especial com data de vigência" onClose={() => setShowAddException(false)}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Tipo de Exceção", type: "text", placeholder: "Ex: Licença Amamentação" },
                    ].map((f) => (
                      <div key={f.label} className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">{f.label}</label>
                        <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Hora de Entrada</label>
                      <TimePicker value="09:30" onChange={() => {}} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Hora de Saída</label>
                      <TimePicker value="16:30" onChange={() => {}} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Data de Início</label>
                      <DatePicker value="" onChange={() => {}} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Data de Fim (opcional)</label>
                      <DatePicker value="" onChange={() => {}} className="w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90">Guardar</button>
                    <button onClick={() => setShowAddException(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
                  </div>
                </div>
              </Modal>
            )}

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Tipo de Exceção", "Detalhe", "Data Início", "Data Fim", "Estado"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tipo: "Licença Amamentação", detalhe: "Carga horária → 6h/dia", inicio: "15/09/2025", fim: "14/09/2026", status: "Vigente", sv: "success" },
                    { tipo: "Horário Especial", detalhe: "Entrada diferida 09:30", inicio: "01/01/2025", fim: "31/08/2025", status: "Expirado", sv: "muted" },
                    { tipo: "Licença Médica", detalhe: "Ausência total", inicio: "03/07/2024", fim: "14/07/2024", status: "Histórico", sv: "muted" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm">{row.tipo}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.detalhe}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.inicio}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.fim}</td>
                      <td className="px-4 py-3"><Badge variant={row.sv as any}>{row.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* ── Histórico de Horários tab ── */}
      {activeTab === "history" && <ProfileScheduleHistory />}
    </div>
  );
}

// ─── Absence Management ────────────────────────────────────────────────────────

function AbsenceManagement() {
  const [absences, setAbsences] = useState(ABSENCES);
  const [selected, setSelected] = useState<number | null>(1);
  const [filter, setFilter] = useState<"all" | "pending" | "justified" | "unjustified">("pending");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [infoSent, setInfoSent] = useState<number[]>([]);

  const [fAssistant, setFAssistant] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fReason, setFReason] = useState(ABSENCE_TYPES_MOCK[0].name);
  const [fNote, setFNote] = useState("");
  const [fStatus, setFStatus] = useState<"" | "justified" | "unjustified">("");
  const [fDocName, setFDocName] = useState("");

  const filtered = absences.filter((a) => filter === "all" || a.status === filter);
  const sel = absences.find((a) => a.id === selected);

  function openAdd() {
    setEditId(null); setFAssistant(""); setFStart(""); setFEnd("");
    setFReason(ABSENCE_TYPES_MOCK[0].name); setFNote(""); setFStatus(""); setFDocName("");
    setShowForm(true);
  }

  function openEdit(a: typeof absences[0]) {
    setEditId(a.id); setFAssistant(a.assistant); setFStart(a.start); setFEnd(a.end);
    setFReason(a.reason); setFNote(a.note);
    setFStatus(a.status === "pending" ? "" : a.status as "justified" | "unjustified");
    setFDocName(a.documentPath ?? "");
    setShowForm(true);
  }

  function handleSave() {
    if (!fAssistant || !fStart || !fEnd) return;
    const assistant = ASSISTANTS.find((a) => a.name === fAssistant);
    const status = fStatus !== "" ? fStatus : "pending";
    if (editId !== null) {
      setAbsences((prev) => prev.map((a) => a.id === editId
        ? { ...a, assistant: fAssistant, initials: assistant?.initials ?? a.initials, start: fStart, end: fEnd, reason: fReason, note: fNote, status, documentPath: fDocName || null }
        : a
      ));
      if (selected === editId) setSelected(editId);
    } else {
      const newId = Math.max(...absences.map((a) => a.id)) + 1;
      setAbsences((prev) => [...prev, {
        id: newId, assistant: fAssistant, initials: assistant?.initials ?? "??",
        start: fStart, end: fEnd, days: 1, reason: fReason, status,
        submitted: "27 Jan 2026", note: fNote, documentPath: fDocName || null,
        conflict: false, conflictDetail: "",
      }]);
      setSelected(newId);
    }
    setShowForm(false);
  }

  function handleDelete(id: number) {
    setAbsences((prev) => prev.filter((a) => a.id !== id));
    if (selected === id) setSelected(null);
    setDeleteConfirm(null);
  }

  function justify(id: number, v: "justified" | "unjustified") {
    setAbsences((prev) => prev.map((a) => a.id === id ? { ...a, status: v } : a));
  }

  const statusBadge = (s: string) => {
    if (s === "justified")   return <Badge variant="success">Justificada</Badge>;
    if (s === "unjustified") return <Badge variant="danger">Injustificada</Badge>;
    return <Badge variant="warning">Pendente</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Ausências</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão e justificação de faltas da equipa</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={14} />Nova Ausência
        </button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-foreground">{editId !== null ? "Editar Ausência" : "Registar Ausência"}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted"><X size={15} className="text-muted-foreground" /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Assistente */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Assistente *</label>
                  <select value={fAssistant} onChange={(e) => setFAssistant(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Selecionar...</option>
                    {ASSISTANTS.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Data de Início *</label>
                    <DatePicker value={fStart} onChange={setFStart} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Data de Fim *</label>
                    <DatePicker value={fEnd} onChange={setFEnd} className="w-full" />
                  </div>
                </div>
                {/* Tipo */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Tipo de Falta</label>
                  <select value={fReason} onChange={(e) => setFReason(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                    {ABSENCE_TYPES_MOCK.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                {/* Notas */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Notas</label>
                  <textarea value={fNote} onChange={(e) => setFNote(e.target.value)} rows={2} placeholder="Observações sobre a ausência..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                </div>
                {/* Separador opcional */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-3">Informação opcional — pode ser preenchida agora ou mais tarde</p>
                  {/* Documento */}
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground block mb-1.5">Documento de Justificação</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input-background text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        <Paperclip size={13} />
                        {fDocName ? fDocName : "Anexar ficheiro..."}
                        <input type="file" className="hidden" onChange={(e) => setFDocName(e.target.files?.[0]?.name ?? "")} accept=".pdf,.jpg,.jpeg,.png" />
                      </label>
                      {fDocName && <button onClick={() => setFDocName("")} className="p-1 rounded hover:bg-muted"><X size={12} className="text-muted-foreground" /></button>}
                    </div>
                  </div>
                  {/* Estado */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Classificar Falta</label>
                    <div className="flex gap-2">
                      {([
                        { value: "" as const,            label: "Deixar Pendente",  cls: "border-border text-muted-foreground" },
                        { value: "justified" as const,   label: "Justificada",      cls: "border-[#0E7C59]/40 text-[#0E7C59]" },
                        { value: "unjustified" as const, label: "Injustificada",    cls: "border-[#C8291A]/40 text-[#C8291A]" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFStatus(opt.value)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${fStatus === opt.value ? (opt.value === "justified" ? "bg-[#0E7C59] text-white border-[#0E7C59]" : opt.value === "unjustified" ? "bg-[#C8291A] text-white border-[#C8291A]" : "bg-muted text-foreground border-border") : `bg-transparent ${opt.cls} hover:bg-muted/40`}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
                <button onClick={handleSave} disabled={!fAssistant || !fStart || !fEnd} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                  {editId !== null ? "Guardar Alterações" : "Registar"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (() => {
        const a = absences.find((x) => x.id === deleteConfirm);
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDeleteConfirm(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={20} className="text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Eliminar ausência?</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  A ausência de <span className="font-medium text-foreground">{a?.assistant}</span> ({a?.start} – {a?.end}) será permanentemente eliminada.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">Eliminar</button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 520 }}>
        {/* List */}
        <div className={`lg:col-span-2 flex flex-col border border-border rounded-lg overflow-hidden bg-card ${selected ? "hidden lg:flex" : "flex"}`}>
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-1 flex-wrap">
            {([{ id: "pending", label: "Pendentes" }, { id: "justified", label: "Justificadas" }, { id: "unjustified", label: "Injustificadas" }, { id: "all", label: "Todas" }] as const).map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filter === f.id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}>
                {f.label}
                {f.id === "pending" && <span className="ml-1 bg-[#D97706] text-white rounded-full px-1 text-[9px]">{absences.filter((a) => a.status === "pending").length}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem ausências</div>}
            {filtered.map((absence) => (
              <div key={absence.id} className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-muted/30 group ${selected === absence.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
                <button className="w-full text-left" onClick={() => setSelected(absence.id)}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-primary font-mono">{absence.initials}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground flex-1">{absence.assistant}</span>
                    {absence.conflict && <AlertTriangle size={12} className="text-[#C8291A] flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{absence.start} – {absence.end} · {absence.days}d · {absence.reason}</p>
                  <div className="mt-1.5">{statusBadge(absence.status)}</div>
                </button>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(absence); }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors">
                    <Pencil size={10} />Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(absence.id); }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 hover:bg-destructive/5 transition-colors">
                    <Trash2 size={10} />Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className={`lg:col-span-3 ${selected ? "block" : "hidden lg:block"}`}>
          {!sel ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center"><Inbox size={28} className="text-muted-foreground/25 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Selecione uma ausência</p></div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="lg:hidden p-1 rounded hover:bg-muted mr-1"><ChevronLeft size={16} className="text-muted-foreground" /></button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary font-mono">{sel.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{sel.assistant}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{sel.start} – {sel.end} · {sel.days} dias · {sel.reason}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusBadge(sel.status)}
                  <button onClick={() => openEdit(sel)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Editar"><Pencil size={13} className="text-muted-foreground" /></button>
                  <button onClick={() => setDeleteConfirm(sel.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Eliminar"><Trash2 size={13} className="text-muted-foreground hover:text-destructive" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {sel.conflict ? (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#C8291A]/20">
                    <AlertTriangle size={15} className="text-[#C8291A] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#7F1D1D] mb-0.5">Conflito com regras de cobertura</p>
                      <p className="text-xs text-[#C8291A]">{sel.conflictDetail}</p>
                    </div>
                  </div>
                ) : sel.status === "pending" ? (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F0FDF4] border border-[#0E7C59]/20">
                    <CheckCircle size={15} className="text-[#0E7C59] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#0E7C59]">Sem conflitos de cobertura detectados para este período.</p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: "Período", value: `${sel.start} – ${sel.end}` }, { label: "Duração", value: `${sel.days} dia(s)` }, { label: "Motivo", value: sel.reason }, { label: "Submetido", value: sel.submitted }].map((f) => (
                    <div key={f.label} className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{f.label}</p>
                      <p className="text-sm font-medium text-foreground">{f.value}</p>
                    </div>
                  ))}
                </div>
                {sel.note && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Observações</p>
                    <p className="text-sm text-foreground">{sel.note}</p>
                  </div>
                )}
                {sel.documentPath && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/10">
                    <Paperclip size={13} className="text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-foreground font-mono flex-1 truncate">{sel.documentPath}</p>
                    <button className="text-xs text-accent hover:underline">Ver</button>
                  </div>
                )}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Pedir Documentação</p>
                  <p className="text-xs text-muted-foreground">Envia um pedido ao assistente para submeter documentação comprovativa.</p>
                  {infoSent.includes(sel.id) ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#0E7C59]"><CheckCircle size={12} />Pedido enviado</div>
                  ) : (
                    <button onClick={() => setInfoSent((p) => [...p, sel.id])} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Paperclip size={12} />Pedir documentação
                    </button>
                  )}
                </div>
              </div>
              {sel.status === "pending" && (
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <button onClick={() => justify(sel.id, "justified")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors">
                    <Check size={14} />Justificar
                  </button>
                  <button onClick={() => justify(sel.id, "unjustified")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors">
                    <X size={14} />Injustificar
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Layout ─────────────────────────────────────────────────────────────

// ─── Assistentes List Page ────────────────────────────────────────────────────

function AssistantesListPage({
  onAddNew,
  onViewProfile,
}: {
  onAddNew: () => void;
  onViewProfile: () => void;
}) {
  const [tab, setTab] = useState<"ativos" | "inativos">("ativos");
  const active = ASSISTANTS.filter((a) => a.id !== 2);
  const inactive = ASSISTANTS.filter((a) => a.id === 2);
  const list = tab === "ativos" ? active : inactive;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Equipa de Assistentes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{ASSISTANTS.length} assistentes registados</p>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <UserPlus size={14} />
          Adicionar Assistente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-px border-b border-border mb-5">
        {([
          { id: "ativos" as const, label: "Ativos", count: active.length, color: "bg-[#0E7C59]" },
          { id: "inativos" as const, label: "Inativos / Em Licença", count: inactive.length, color: "bg-muted-foreground" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.color}`} />
            {t.label}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Nenhum assistente nesta categoria</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nome</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">Observação</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:block">Estado</span>
            <span />
          </div>
          {list.map((a, i) => (
            <button
              key={a.id}
              onClick={onViewProfile}
              className={`w-full grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 items-center text-left transition-colors hover:bg-muted/50 group ${i !== list.length - 1 ? "border-b border-border" : ""} ${tab === "inativos" ? "opacity-60 hover:opacity-90" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tab === "ativos" ? "bg-primary/10" : "bg-muted"}`}>
                  <span className={`text-xs font-bold font-mono ${tab === "ativos" ? "text-primary" : "text-muted-foreground"}`}>{a.initials}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate block">{a.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{a.mecanografico}</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block truncate">{a.exception ?? "—"}</span>
              <span className="hidden sm:flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${tab === "ativos" ? "bg-[#0E7C59]" : "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{tab === "ativos" ? "Ativo" : "Inativo"}</span>
              </span>
              <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function AssistantesPageWrapper({ onViewProfile }: { onViewProfile: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  if (showCreate) return (
    <AddEditAssistant onSave={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
  );
  return <AssistantesListPage onAddNew={() => setShowCreate(true)} onViewProfile={onViewProfile} />;
}

// ─── Add / Edit Assistant ─────────────────────────────────────────────────────

function AddEditAssistant({
  onSave,
  onCancel,
  onBack,
  isEdit = false,
}: {
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
  isEdit?: boolean;
}) {
  const [section, setSection]           = useState<"personal" | "schedule">("personal");
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [shiftProfile, setShiftProfile] = useState<"fixo" | "rotativo">(isEdit ? "rotativo" : "fixo");
  const [rotPeriod, setRotPeriod]       = useState<"semanal" | "quinzenal" | "mensal">("quinzenal");
  const [rotStartDate, setRotStartDate] = useState(isEdit ? "2026-02-01" : "");
  const [rotEndDate, setRotEndDate]     = useState("");
  const [rotStartsWith, setRotStartsWith] = useState<"A" | "B">("A");
  const [fixedStartDate, setFixedStartDate] = useState(isEdit ? "2025-09-01" : "");
  const [fixedEndDate, setFixedEndDate]     = useState("");
  // Fixed shift / Shift A lunch
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchStart, setLunchStart]     = useState("11:30");
  const [lunchEnd, setLunchEnd]         = useState("13:30");
  const [lunchDuration, setLunchDuration] = useState("30");
  // Shift B lunch (rotating only)
  const [shiftBLunchEnabled, setShiftBLunchEnabled] = useState(true);
  const [shiftBLunchStart, setShiftBLunchStart]     = useState("12:00");
  const [shiftBLunchEnd, setShiftBLunchEnd]         = useState("13:30");
  const [shiftBLunchDuration, setShiftBLunchDuration] = useState("30");

  // Mock schedule history (in a real app, fetched from API)
  const SCHEDULE_HISTORY = [
    {
      id: 1, type: "rotativo" as const, period: "Quinzenal",
      shiftA: { entry: "07:30", exit: "15:30" }, shiftB: { entry: "10:00", exit: "17:00" },
      days: ["Seg","Ter","Qua","Qui","Sex"], startsWith: "A",
      from: "2026-02-01", to: null,
    },
    {
      id: 2, type: "fixo" as const,
      entry: "08:00", exit: "16:00",
      days: ["Seg","Ter","Qua","Qui","Sex"],
      lunch: { start: "12:00", end: "13:30", duration: 30 },
      from: "2025-09-01", to: "2026-01-31",
    },
    {
      id: 3, type: "fixo" as const,
      entry: "07:30", exit: "15:30",
      days: ["Seg","Ter","Qua","Qui","Sex","Sáb"],
      lunch: { start: "11:30", end: "13:00", duration: 30 },
      from: "2024-01-01", to: "2025-08-31",
    },
    {
      id: 4, type: "fixo" as const,
      entry: "07:00", exit: "15:00",
      days: ["Seg","Ter","Qua","Qui","Sex"],
      lunch: { start: "12:00", end: "13:00", duration: 30 },
      from: "2022-09-01", to: "2023-12-31",
    },
  ];

  const sections = [
    { id: "personal" as const,  label: "Dados Pessoais", icon: <User size={14} /> },
    { id: "schedule" as const,  label: "Horário Padrão", icon: <Clock size={14} /> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? "Editar Assistente" : "Novo Assistente"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Altere os dados do perfil de Elena Rodrigues" : "Preencha os dados para criar o perfil"}
          </p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-px border-b border-border mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              section === s.id
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Personal data ── */}
      {section === "personal" && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-5 col-span-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Identificação</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Primeiro Nome *", placeholder: "Ex: Ana",            type: "text",  span: 1, editValue: "Elena" },
                { label: "Apelido *",       placeholder: "Ex: Ferreira",       type: "text",  span: 1, editValue: "Rodrigues" },
                { label: "Nº Mecanográfico *", placeholder: "Ex: ME-00127",   type: "text",  span: 1, editValue: "ME-00127" },
                { label: "Email institucional *", placeholder: "a.ferreira@sgde.pt", type: "email", span: 2, editValue: "e.rodrigues@sgde.pt" },
                { label: "Telefone",        placeholder: "+351 9XX XXX XXX",   type: "tel",   span: 1, editValue: "+351 912 345 678" },
                { label: "NIF",             placeholder: "Ex: 123 456 789",    type: "text",  span: 1, editValue: "234 567 890" },
                { label: "Nº Segurança Social", placeholder: "Ex: 12345678901", type: "text", span: 1, editValue: "12345678901" },
                { label: "Data de Nascimento", placeholder: "",                type: "date",  span: 1, editValue: "1988-03-14" },
              ].map((f) => (
                <div key={f.label} className={f.span === 2 ? "col-span-2" : "col-span-1"}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    defaultValue={isEdit ? f.editValue : ""}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Data de Admissão</label>
                <DatePicker value="" onChange={() => {}} className="w-full" />
              </div>
              <div className="col-span-full sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground block mb-1.5">Registo Criminal</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-colors">
                    <Upload size={16} className="text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Clique para anexar ou arraste o ficheiro</p>
                      <p className="text-xs text-muted-foreground/60">PDF, JPG, PNG · Max 5MB</p>
                    </div>
                  </div>
                  <div className="sm:w-44">
                    <label className="text-xs text-muted-foreground block mb-1.5">Data de Validade</label>
                    <DatePicker value="" onChange={() => {}} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Morada</h4>
            <div className="space-y-3">
              {[
                { label: "Rua / Avenida", placeholder: "Ex: Rua das Flores, 42", type: "text", editValue: "Av. da Liberdade, 120" },
                { label: "Código Postal", placeholder: "Ex: 1000-001",           type: "text", editValue: "1250-096" },
                { label: "Cidade",        placeholder: "Ex: Lisboa",             type: "text", editValue: "Lisboa" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} defaultValue={isEdit ? f.editValue : ""} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Contacto de Emergência</h4>
            <div className="space-y-3">
              {[
                { label: "Nome",       placeholder: "Ex: Manuel Ferreira",  type: "text", editValue: "Carlos Rodrigues" },
                { label: "Parentesco", placeholder: "Ex: Cônjuge",          type: "text", editValue: "Cônjuge" },
                { label: "Telefone",   placeholder: "+351 9XX XXX XXX",     type: "tel",  editValue: "+351 934 567 890" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} defaultValue={isEdit ? f.editValue : ""} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Schedule config ── */}
      {section === "schedule" && (
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Histórico de Horários</p>
              <p className="text-xs text-muted-foreground mt-0.5">{SCHEDULE_HISTORY.length} perfis registados</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddScheduleModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={14} />Novo Horário
            </button>
          </div>

          {/* History list */}
          <div className="space-y-3">
              {SCHEDULE_HISTORY.map((h, idx) => (
                <div key={h.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${h.type === "rotativo" ? "bg-[#A855F7]/15" : "bg-accent/15"}`}>
                      <Clock size={12} className={h.type === "rotativo" ? "text-[#A855F7]" : "text-accent"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {h.type === "fixo" ? "Turno Fixo" : `Turno Rotativo · ${(h as any).period}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.from.split("-").reverse().join("/")}
                        {" → "}
                        {h.to ? h.to.split("-").reverse().join("/") : <span className="text-accent font-medium">Em vigor</span>}
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">Atual</span>
                    )}
                  </div>
                  {/* Row detail */}
                  <div className="px-4 py-3 space-y-2">
                    {h.type === "fixo" ? (
                      <>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <span><span className="font-medium text-foreground">Entrada:</span> {(h as any).entry}</span>
                          <span><span className="font-medium text-foreground">Saída:</span> {(h as any).exit}</span>
                          {(h as any).lunch && (
                            <span><span className="font-medium text-foreground">Almoço:</span> {(h as any).lunch.start}–{(h as any).lunch.end} ({(h as any).lunch.duration} min)</span>
                          )}
                          <span><span className="font-medium text-foreground">Dias:</span> {(h as any).days.join(", ")}</span>
                        </div>
                        {/* Mini timeline */}
                        <div className="relative h-5 rounded bg-muted/40 border border-border/40 overflow-hidden mt-1">
                          {(() => {
                            const entryH = parseInt((h as any).entry.split(":")[0]);
                            const entryM = parseInt((h as any).entry.split(":")[1]);
                            const exitH  = parseInt((h as any).exit.split(":")[0]);
                            const exitM  = parseInt((h as any).exit.split(":")[1]);
                            const lunchSH = (h as any).lunch ? parseInt((h as any).lunch.start.split(":")[0]) : 0;
                            const lunchSM = (h as any).lunch ? parseInt((h as any).lunch.start.split(":")[1]) : 0;
                            const lunchEH = (h as any).lunch ? parseInt((h as any).lunch.end.split(":")[0]) : 0;
                            const lunchEM = (h as any).lunch ? parseInt((h as any).lunch.end.split(":")[1]) : 0;
                            const total = 15 * 60; // 6h–21h window in minutes
                            const toX = (hh: number, mm: number) => `${Math.max(0, ((hh - 6) * 60 + mm) / total * 100)}%`;
                            const toW = (h1: number, m1: number, h2: number, m2: number) =>
                              `${Math.max(0, ((h2 - h1) * 60 + (m2 - m1)) / total * 100)}%`;
                            return (<>
                              <div className="absolute inset-y-0.5 rounded bg-accent/70" style={{ left: toX(entryH, entryM), width: toW(entryH, entryM, exitH, exitM) }} />
                              {(h as any).lunch && (
                                <div className="absolute inset-y-0.5 rounded bg-[#F59E0B]/90" style={{ left: toX(lunchSH, lunchSM), width: toW(lunchSH, lunchSM, lunchEH, lunchEM) }} />
                              )}
                            </>);
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        {(["A","B"] as const).map((ab) => {
                          const s = (h as any)[`shift${ab}`];
                          const clr = ab === "A" ? "#6366F1" : "#A855F7";
                          return (
                            <div key={ab} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: clr }}>{ab}</div>
                              <span>{s.entry} – {s.exit}</span>
                            </div>
                          );
                        })}
                        <div className="col-span-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Dias:</span> {(h as any).days.join(", ")} · Começa com Horário {(h as any).startsWith}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          {/* ── Add / Edit schedule modal ── */}
          {showAddScheduleModal && (
            <Modal
              title="Novo Horário Padrão"
              subtitle="Defina o perfil de turno e o período de vigência"
              onClose={() => setShowAddScheduleModal(false)}
              maxWidth="max-w-4xl"
            >
              <div className="space-y-5">

          {/* Shift type selector */}
          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Perfil de Turno</h4>
            <div className="flex gap-2">
              {(["fixo", "rotativo"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setShiftProfile(v)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    shiftProfile === v
                      ? "bg-accent text-white border-accent"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
                  }`}
                >
                  {v === "fixo" ? "Turno Fixo" : "Turno Rotativo"}
                </button>
              ))}
            </div>
          </Card>

          {/* ── Fixed shift ── */}
          {shiftProfile === "fixo" && (
            <Card className="p-5 space-y-5">
              {/* Entry / Exit */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Horário</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Hora de Entrada *</label>
                    <TimePicker value={isEdit ? "07:30" : "07:00"} onChange={() => {}} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Hora de Saída *</label>
                    <TimePicker value={isEdit ? "15:30" : "15:00"} onChange={() => {}} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Working days */}
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dias de Trabalho</p>
                <div className="flex gap-1.5">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                    <label key={d} className="cursor-pointer">
                      <input type="checkbox" className="hidden peer" defaultChecked={i < 5} />
                      <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-xs font-medium text-muted-foreground peer-checked:bg-accent peer-checked:text-white peer-checked:border-accent transition-colors">
                        {d}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lunch */}
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pausa de Almoço</p>
                  <button
                    type="button"
                    onClick={() => setLunchEnabled((v) => !v)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${lunchEnabled ? "bg-accent" : "bg-muted-foreground/30"}`}
                    role="switch" aria-checked={lunchEnabled}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${lunchEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {lunchEnabled ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Início possível</label>
                      <TimePicker value={lunchStart} onChange={setLunchStart} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Fim possível</label>
                      <TimePicker value={lunchEnd} onChange={setLunchEnd} className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Duração</label>
                      <select value={lunchDuration} onChange={(e) => setLunchDuration(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border/50">
                    Sem pausa de almoço — o assistente não terá bloco de almoço gerado automaticamente.
                  </p>
                )}
              </div>

              <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-xs text-muted-foreground">O assistente terá sempre o mesmo horário de entrada e saída. Qualquer alteração é feita manualmente por exceção.</p>
              </div>

              {/* Vigência */}
              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vigência</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Data de Início *</label>
                    <DatePicker value={fixedStartDate} onChange={setFixedStartDate} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Data de Fim</label>
                    <DatePicker value={fixedEndDate} onChange={setFixedEndDate} className="w-full" />
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Em branco = vigência em aberto</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Rotating shift ── */}
          {shiftProfile === "rotativo" && (
            <div className="space-y-5">
              {/* Rotation meta */}
              <Card className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Configuração da Rotação</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Período de Rotatividade</label>
                    <div className="flex gap-1.5">
                      {(["semanal", "quinzenal", "mensal"] as const).map((p) => (
                        <button key={p} type="button" onClick={() => setRotPeriod(p)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                            rotPeriod === p ? "bg-accent/10 text-accent border-accent/40" : "border-border text-muted-foreground hover:text-foreground"
                          }`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Começa com</label>
                    <div className="flex gap-1.5">
                      {(["A", "B"] as const).map((ab) => (
                        <button key={ab} type="button" onClick={() => setRotStartsWith(ab)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                            rotStartsWith === ab
                              ? ab === "A" ? "bg-[#6366F1] text-white border-[#6366F1]" : "bg-[#A855F7] text-white border-[#A855F7]"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}>{ab}</button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3 border-t border-border/60 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vigência</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">Data de Início *</label>
                        <DatePicker value={rotStartDate} onChange={setRotStartDate} className="w-full" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">Data de Fim</label>
                        <DatePicker value={rotEndDate} onChange={setRotEndDate} className="w-full" />
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Em branco = vigência em aberto</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Shift A and B — each self-contained */}
              <div className="grid grid-cols-2 gap-5">
                {(["A", "B"] as const).map((ab) => {
                  const isA = ab === "A";
                  const clr = isA ? "#6366F1" : "#A855F7";
                  const lunchEn  = isA ? lunchEnabled        : shiftBLunchEnabled;
                  const setLunchEn  = isA ? setLunchEnabled     : setShiftBLunchEnabled;
                  const lunchSt  = isA ? lunchStart          : shiftBLunchStart;
                  const setLunchSt  = isA ? setLunchStart       : setShiftBLunchStart;
                  const lunchEd  = isA ? lunchEnd            : shiftBLunchEnd;
                  const setLunchEd  = isA ? setLunchEnd         : setShiftBLunchEnd;
                  const lunchDur = isA ? lunchDuration       : shiftBLunchDuration;
                  const setLunchDur = isA ? setLunchDuration    : setShiftBLunchDuration;
                  const defEntry = isA ? (isEdit ? "07:30" : "07:00") : (isEdit ? "10:00" : "10:00");
                  const defExit  = isA ? (isEdit ? "15:30" : "15:00") : (isEdit ? "17:00" : "17:00");

                  return (
                    <Card key={ab} className="p-5 space-y-4">
                      {/* Card header */}
                      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: clr }}>{ab}</div>
                        <h4 className="text-sm font-semibold text-foreground">Horário {ab}</h4>
                      </div>

                      {/* Entry / Exit */}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Horário</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Hora de Entrada *</label>
                            <TimePicker value={defEntry} onChange={() => {}} className="w-full" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Hora de Saída *</label>
                            <TimePicker value={defExit} onChange={() => {}} className="w-full" />
                          </div>
                        </div>
                      </div>

                      {/* Working days */}
                      <div className="border-t border-border/60 pt-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dias de Trabalho</p>
                        <div className="flex gap-1 flex-wrap">
                          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                            <label key={d} className="cursor-pointer">
                              <input type="checkbox" className="hidden peer" defaultChecked={i < 5} />
                              <div className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center text-[11px] font-medium transition-colors
                                text-muted-foreground peer-checked:text-white peer-checked:border-transparent
                                ${isA ? "peer-checked:bg-[#6366F1]" : "peer-checked:bg-[#A855F7]"}`}>
                                {d}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Lunch */}
                      <div className="border-t border-border/60 pt-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pausa de Almoço</p>
                          <button type="button" onClick={() => setLunchEn((v) => !v)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${lunchEn ? "bg-accent" : "bg-muted-foreground/30"}`}
                            role="switch" aria-checked={lunchEn}>
                            <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${lunchEn ? "translate-x-4" : "translate-x-0"}`} />
                          </button>
                        </div>
                        {lunchEn ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Início possível</label>
                                <TimePicker value={lunchSt} onChange={setLunchSt} className="w-full" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Fim possível</label>
                                <TimePicker value={lunchEd} onChange={setLunchEd} className="w-full" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Duração</label>
                              <select value={lunchDur} onChange={(e) => setLunchDur(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-2 border border-border/50">
                            Sem pausa de almoço neste turno.
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {rotStartDate && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <Info size={11} className="text-accent flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">
                    Rotação inicia a <span className="font-mono font-medium text-foreground">{rotStartDate}</span> com o Horário <span className={`font-bold ${rotStartsWith === "A" ? "text-[#6366F1]" : "text-[#A855F7]"}`}>{rotStartsWith}</span>. Alterna {rotPeriod === "semanal" ? "semanalmente" : rotPeriod === "quinzenal" ? "quinzenalmente" : "mensalmente"}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          <Card className="p-5 bg-muted/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart2 size={13} />
              {shiftProfile === "rotativo" ? "Pré-visualização da Rotação" : "Pré-visualização do Horário Típico"}
            </h4>

            {shiftProfile === "fixo" ? (
              <>
                <div className="relative h-8 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                  {slotsToBlocks(Array.from({ length: 96 }, (_, i): BlockState =>
                    i < 30 ? "off" : i < 34 ? "surveillance" : i < 52 ? "work" : i < 56 ? "lunch" : i < 68 ? "work" : "off"
                  )).map((b) => {
                    const cs = Math.max(b.start, VIEW_START); const ce = Math.min(b.start + b.count, VIEW_END);
                    if (b.state === "off" || ce <= cs) return null;
                    return <div key={b.start} className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-80`} style={{ left: `${((cs-VIEW_START)/VIEW_SLOTS)*100}%`, width: `${((ce-cs)/VIEW_SLOTS)*100}%` }} />;
                  })}
                </div>
                <div className="flex mt-1.5">
                  {HOUR_LABELS.slice(6, 21).map((h, i) => (
                    <div key={i} className="flex-none text-[9px] font-mono text-muted-foreground" style={{ width: `calc(100% / 15)` }}>{h}</div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {[
                  { label: `${rotPeriod === "semanal" ? "Semana" : rotPeriod === "quinzenal" ? "Quinzena" : "Mês"} 1 — Horário ${rotStartsWith}`, profile: rotStartsWith, entry: rotStartsWith === "A" ? 30 : 40 },
                  { label: `${rotPeriod === "semanal" ? "Semana" : rotPeriod === "quinzenal" ? "Quinzena" : "Mês"} 2 — Horário ${rotStartsWith === "A" ? "B" : "A"}`, profile: rotStartsWith === "A" ? "B" : "A" as "A" | "B", entry: rotStartsWith === "A" ? 40 : 30 },
                ].map(({ label, profile, entry }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white ${profile === "A" ? "bg-[#6366F1]" : "bg-[#A855F7]"}`}>{profile}</div>
                      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                      <span className="text-[9px] font-mono text-muted-foreground ml-auto">{TIME_SLOTS[entry]} – {TIME_SLOTS[Math.min(entry + 32, 95)]}</span>
                    </div>
                    <div className="relative h-6 rounded overflow-hidden border border-border/50 bg-muted/30">
                      {slotsToBlocks(Array.from({ length: 96 }, (_, i): BlockState =>
                        i < entry ? "off" : i < entry + 4 ? "surveillance" : i < entry + 20 ? "work" : i < entry + 24 ? "lunch" : i < entry + 32 ? "work" : "off"
                      )).map((b) => {
                        const cs = Math.max(b.start, VIEW_START); const ce = Math.min(b.start + b.count, VIEW_END);
                        if (b.state === "off" || ce <= cs) return null;
                        return <div key={b.start} className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-80`} style={{ left: `${((cs-VIEW_START)/VIEW_SLOTS)*100}%`, width: `${((ce-cs)/VIEW_SLOTS)*100}%` }} />;
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex mt-0.5">
                  {HOUR_LABELS.slice(6, 21).map((h, i) => (
                    <div key={i} className="flex-none text-[9px] font-mono text-muted-foreground" style={{ width: `calc(100% / 15)` }}>{h}</div>
                  ))}
                </div>
                {rotStartDate && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Info size={11} className="text-accent flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground">
                      Rotação inicia a <span className="font-mono font-medium text-foreground">{rotStartDate}</span> com o Horário <span className={`font-bold ${rotStartsWith === "A" ? "text-[#6366F1]" : "text-[#A855F7]"}`}>{rotStartsWith}</span>. Alterna {rotPeriod === "semanal" ? "semanalmente" : rotPeriod === "quinzenal" ? "quinzenalmente" : "mensalmente"}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <Save size={14} />Guardar Horário
                </button>
              </div>

              </div>
            </Modal>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
        <div className="flex gap-2">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-2 h-2 rounded-full transition-colors ${section === s.id ? "bg-accent" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        {section !== "schedule" ? (
          <button
            onClick={() => setSection("schedule")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Seguinte
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors"
          >
            <Save size={14} />
            {isEdit ? "Guardar Alterações" : "Criar Assistente"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Relatórios & Analytics ───────────────────────────────────────────────────

function RelatoriosPage() {
  const totalAbsenceDays = REPORTS_AUSENCIAS.reduce((s, r) => s + r.days, 0);
  const pendingCount = REPORTS_AUSENCIAS.filter((r) => r.status === "pending").length;
  const coverageAlerts = REPORTS_ALERTAS.reduce((s, r) => s + r.alerts, 0);
  const activeExceptions = ASSISTANTS.filter((a) => a.exception !== null).length;

  const kpis = [
    {
      label: "Alertas de Cobertura",
      value: String(coverageAlerts),
      sub: "acumulado 5 meses",
      icon: <AlertCircle size={16} />,
      variant: "danger" as const,
    },
    {
      label: "Ausências Pendentes",
      value: String(pendingCount),
      sub: "aguardam aprovação",
      icon: <Inbox size={16} />,
      variant: pendingCount > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Dias Ausentes — Jan",
      value: String(totalAbsenceDays),
      sub: `${REPORTS_AUSENCIAS.filter((r) => r.days > 0).length} assistentes afetados`,
      icon: <UserX size={16} />,
      variant: "muted" as const,
    },
    {
      label: "Exceções Activas",
      value: String(activeExceptions),
      sub: "horários especiais",
      icon: <AlertTriangle size={16} />,
      variant: activeExceptions > 2 ? ("warning" as const) : ("success" as const),
    },
  ];

  const variantStyles = {
    danger:  { bg: "bg-destructive/10",  text: "text-destructive",  icon: "text-destructive" },
    warning: { bg: "bg-[#D97706]/10",    text: "text-[#D97706]",    icon: "text-[#D97706]" },
    success: { bg: "bg-[#0E7C59]/10",    text: "text-[#0E7C59]",    icon: "text-[#0E7C59]" },
    muted:   { bg: "bg-muted",           text: "text-muted-foreground", icon: "text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title="Relatórios" subtitle="Cobertura, absentismo e exceções — Janeiro 2026" />
        <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
          <Download size={13} />Exportar PDF
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const s = variantStyles[k.variant];
          return (
            <Card key={k.label} className="p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3 ${s.icon}`}>
                {k.icon}
              </div>
              <p className="text-2xl font-semibold font-mono text-foreground">{k.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{k.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coverage vs minimum this week */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Cobertura Diária vs Mínimo</h3>
          <p className="text-xs text-muted-foreground mb-4">Semana de 27 Jan — vermelho indica incumprimento</p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORTS_COVERAGE} barGap={4} barCategoryGap="30%">
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} domain={[0, 13]} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E8EBF2", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v: number, name: string) => [v, name === "present" ? "Presentes" : "Mínimo"]}
                />
                <Bar key="bar-present" dataKey="present" radius={[4, 4, 0, 0]} name="present">
                  {REPORTS_COVERAGE.map((e, i) => (
                    <Cell key={`cov-${i}`} fill={e.present < e.min ? "#C8291A" : "#1A56DB"} />
                  ))}
                </Bar>
                <Bar key="bar-min" dataKey="min" fill="#E8EBF2" radius={[4, 4, 0, 0]} name="min" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Coverage alerts per month */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Alertas de Cobertura Insuficiente</h3>
          <p className="text-xs text-muted-foreground mb-4">Número de incumprimentos detectados por mês</p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORTS_ALERTAS} barCategoryGap="40%">
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} domain={[0, 8]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E8EBF2" }} formatter={(v: number) => [v, "Alertas"]} />
                <Bar key="bar-alerts" dataKey="alerts" radius={[4, 4, 0, 0]}>
                  {REPORTS_ALERTAS.map((e, i) => (
                    <Cell key={`alert-${i}`} fill={e.alerts >= 5 ? "#C8291A" : e.alerts >= 3 ? "#D97706" : "#1A56DB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            {[
              { color: "#C8291A", label: "Crítico (≥5)" },
              { color: "#D97706", label: "Atenção (3–4)" },
              { color: "#1A56DB", label: "Normal (<3)" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Absence types + table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Absence by type */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Ausências por Tipo</h3>
          <p className="text-xs text-muted-foreground mb-3">Total de dias — Jan 2026</p>
          <div style={{ height: 160 }} className="mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key="pie-types"
                  data={REPORTS_ABSENCE_TYPES}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {REPORTS_ABSENCE_TYPES.map((e, i) => (
                    <Cell key={`type-${i}`} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E8EBF2" }} formatter={(v: number, name: string) => [`${v} dias`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {REPORTS_ABSENCE_TYPES.map((t) => (
              <div key={t.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-xs text-muted-foreground">{t.type}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-foreground">{t.count}d</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Absence table */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Ausências por Assistente — Jan 2026</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Assistente", "Tipo", "Dias", "Estado", "Cobertura"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORTS_AUSENCIAS.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary font-mono">{r.initials}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {r.days > 0 ? `${r.days}d` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.status === "approved" && <Badge variant="success">Aprovada</Badge>}
                      {r.status === "pending"  && <Badge variant="warning">Pendente</Badge>}
                      {r.status === "rejected" && <Badge variant="danger">Rejeitada</Badge>}
                      {r.status === "none"     && <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={
                        r.cobertura === "impacto alto"   ? "danger"  :
                        r.cobertura === "impacto médio"  ? "warning" :
                        r.cobertura === "impacto baixo"  ? "muted"   : "success"
                      }>
                        {r.cobertura}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Simulador de Escala ──────────────────────────────────────────────────────

function SimuladorPage() {
  const [selectedAssistant, setSelectedAssistant] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("2026-02-03");
  const [endDate, setEndDate] = useState("2026-02-05");
  const [simulated, setSimulated] = useState(false);

  const assistant = ASSISTANTS.find((a) => a.id === selectedAssistant);

  const impactDays = [
    { day: "Ter 03 Fev", before: 10, after: 9, alert: false },
    { day: "Qua 04 Fev", before: 11, after: 10, alert: false },
    { day: "Qui 05 Fev", before: 8,  after: 7,  alert: true  },
  ];

  return (
    <div>
      <SectionHeader title="Simulador de Escala" subtitle="Analise o impacto de uma ausência antes de aprovar" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-4">Parâmetros</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Assistente *</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedAssistant ?? ""}
                onChange={(e) => { setSelectedAssistant(Number(e.target.value)); setSimulated(false); }}
              >
                <option value="">Selecionar assistente...</option>
                {ASSISTANTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Data de Início *</label>
              <DatePicker value={startDate} onChange={(v) => { setStartDate(v); setSimulated(false); }} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Data de Fim *</label>
              <DatePicker value={endDate} onChange={(v) => { setEndDate(v); setSimulated(false); }} className="w-full" />
            </div>
            <button
              disabled={!selectedAssistant}
              onClick={() => setSimulated(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Activity size={14} />
              Simular Impacto
            </button>
          </div>
        </Card>

        {/* Result panel */}
        <div className="lg:col-span-2 space-y-4">
          {!simulated ? (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Sliders size={32} className="text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Configure os parâmetros e clique em "Simular Impacto"</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Summary alert */}
              {impactDays.some((d) => d.alert) ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#FEF2F2] border border-[#C8291A]/20">
                  <AlertTriangle size={16} className="text-[#C8291A] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#7F1D1D]">Atenção: Cobertura insuficiente detectada</p>
                    <p className="text-xs text-[#C8291A] mt-0.5">
                      A ausência de <strong>{assistant?.name}</strong> em {startDate} – {endDate} causará cobertura abaixo do mínimo em 1 dia.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F0FDF4] border border-[#0E7C59]/20">
                  <CheckCircle size={16} className="text-[#0E7C59] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#0E7C59]">Ausência aprovável: todos os dias mantêm cobertura mínima.</p>
                </div>
              )}

              {/* Impact per day */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Impacto por Dia</h3>
                </div>
                <div className="divide-y divide-border">
                  {impactDays.map((d, i) => (
                    <div key={i} className={`px-4 py-3 flex items-center gap-4 ${d.alert ? "bg-[#FEF2F2]" : ""}`}>
                      <span className="text-xs font-mono font-medium w-24 flex-shrink-0">{d.day}</span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Antes:</span>
                          <span className="text-xs font-mono font-semibold text-foreground">{d.before}/12</span>
                        </div>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Depois:</span>
                          <span className={`text-xs font-mono font-semibold ${d.alert ? "text-[#C8291A]" : "text-[#0E7C59]"}`}>{d.after}/12</span>
                        </div>
                      </div>
                      {d.alert ? (
                        <Badge variant="danger">Abaixo do mínimo</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Coverage chart */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Comparação de Cobertura</h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactDays} barGap={4}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#5A6478" }} axisLine={false} tickLine={false} domain={[0, 12]} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E8EBF2" }} />
                      <Bar key="bar-before" dataKey="before" fill="#1A56DB" radius={[3, 3, 0, 0]} name="Antes" opacity={0.4} />
                      <Bar key="bar-after" dataKey="after" fill="#1A56DB" radius={[3, 3, 0, 0]} name="Depois">
                        {impactDays.map((d, i) => <Cell key={`sim-cell-${i}`} fill={d.alert ? "#C8291A" : "#0E7C59"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trocas de Turno ─────────────────────────────────────────────────────────

function TrocasTurnoPage() {
  const [swaps, setSwaps] = useState(SWAP_REQUESTS);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<number | null>(1);

  const filtered = swaps.filter((s) => filter === "all" || s.status === filter);
  const selectedSwap = swaps.find((s) => s.id === selected);

  function handle(id: number, action: "approved" | "rejected") {
    setSwaps((prev) => prev.map((s) => s.id === id ? { ...s, status: action } : s));
    setSelected(null);
  }

  return (
    <div>
      <SectionHeader title="Trocas de Turno" subtitle="Pedidos de troca de turno entre assistentes" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 520 }}>
        {/* Inbox */}
        <div className={`lg:col-span-2 flex flex-col border border-border rounded-lg overflow-hidden bg-card ${selected ? "hidden lg:flex" : "flex"}`}>
          <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-1 flex-wrap">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filter === f ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
                {f === "pending" && <span className="ml-1 bg-[#C8291A] text-white rounded-full px-1 text-[9px]">{swaps.filter((s) => s.status === "pending").length}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem pedidos</div>}
            {filtered.map((swap) => (
              <button key={swap.id} onClick={() => setSelected(swap.id)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-muted/30 ${selected === swap.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{swap.from} ↔ {swap.to}</span>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{swap.submitted}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{swap.date} · {swap.reason}</p>
                <div className="mt-1.5">
                  {swap.status === "pending" && <Badge variant="warning">Pendente</Badge>}
                  {swap.status === "approved" && <Badge variant="success">Aprovado</Badge>}
                  {swap.status === "rejected" && <Badge variant="danger">Rejeitado</Badge>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className={`lg:col-span-3 ${selected ? "block" : "hidden lg:block"}`}>
          {!selectedSwap ? (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center"><Repeat size={28} className="text-muted-foreground/25 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Selecione um pedido</p></div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="lg:hidden p-1 rounded hover:bg-muted mr-1"><ChevronLeft size={16} className="text-muted-foreground" /></button>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm">Pedido de Troca #{selectedSwap.id}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Submetido em {selectedSwap.submitted}</p>
                </div>
                {selectedSwap.status === "pending" && <Badge variant="warning">Pendente</Badge>}
                {selectedSwap.status === "approved" && <Badge variant="success">Aprovado</Badge>}
                {selectedSwap.status === "rejected" && <Badge variant="danger">Rejeitado</Badge>}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Swap visualization */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted/30 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-bold text-primary font-mono">{selectedSwap.fromInit}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{selectedSwap.from}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">{selectedSwap.fromBlock}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight size={16} className="text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground font-mono">{selectedSwap.date}</span>
                    <ArrowLeft size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-xl p-4 text-center">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-bold text-primary font-mono">{selectedSwap.toInit}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{selectedSwap.to}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">{selectedSwap.toBlock}</p>
                  </div>
                </div>
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Motivo</p>
                  <p className="text-sm text-foreground">{selectedSwap.reason}</p>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Info size={13} className="text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    A aprovação desta troca será validada contra as regras mínimas de cobertura. Um recálculo automático será efectuado.
                  </p>
                </div>
              </div>
              {selectedSwap.status === "pending" && (
                <div className="px-5 py-4 border-t border-border flex gap-3">
                  <button onClick={() => handle(selectedSwap.id, "approved")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors">
                    <Check size={14} />Aprovar
                  </button>
                  <button onClick={() => handle(selectedSwap.id, "rejected")} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors">
                    <X size={14} />Rejeitar
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendário de Feriados ───────────────────────────────────────────────────

function FeriadosPage() {
  const [holidays, setHolidays] = useState(HOLIDAYS);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("nacional");

  function addHoliday() {
    if (!newName || !newDate) return;
    setHolidays((prev) => [...prev, { id: prev.length + 1, name: newName, date: newDate, type: newType, impact: "" }]);
    setShowAdd(false); setNewName(""); setNewDate("");
  }

  const typeColors: Record<string, string> = { nacional: "purple", municipal: "default" };

  return (
    <div>
      <SectionHeader title="Calendário de Feriados" subtitle="Gestão de feriados nacionais e municipais e seu impacto na escala" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Feriados Registados — 2026</h3>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors">
              <Plus size={12} />Adicionar
            </button>
          </div>

          {showAdd && (
            <Modal title="Novo Feriado" subtitle="Adicionar ao calendário de feriados" onClose={() => setShowAdd(false)}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-xs text-muted-foreground block mb-1.5">Nome *</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Natal" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Data *</label>
                    <DatePicker value={newDate} onChange={setNewDate} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Tipo</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="nacional">Nacional</option>
                      <option value="municipal">Municipal</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={addHoliday} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90">Guardar</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
                </div>
              </div>
            </Modal>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Feriado", "Data", "Tipo", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{h.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{h.date}</td>
                      <td className="px-4 py-3"><Badge variant={typeColors[h.type] as any}>{h.type.charAt(0).toUpperCase() + h.type.slice(1)}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setHolidays((prev) => prev.filter((x) => x.id !== h.id))} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Info card */}
        <div className="space-y-4">
          <Card className="p-5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Próximos Feriados</h4>
            <div className="space-y-3">
              {holidays.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${h.type === "nacional" ? "bg-[#1A56DB]" : "bg-[#7C3AED]"}`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{h.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{h.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 bg-[#D97706]/5 border-[#D97706]/20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-[#D97706] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Atenção</p>
                <p className="text-xs text-muted-foreground mt-1">Feriados com impacto "Alto" activam um recálculo automático da escala com aplicação das regras mínimas de segurança.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Log de Auditoria ─────────────────────────────────────────────────────────

function AuditoriaPage() {
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const typeStyles: Record<string, { badge: string; dot: string }> = {
    approve:  { badge: "success", dot: "bg-[#0E7C59]" },
    reject:   { badge: "danger",  dot: "bg-[#C8291A]" },
    edit:     { badge: "default", dot: "bg-[#1A56DB]" },
    create:   { badge: "purple",  dot: "bg-[#7C3AED]" },
    system:   { badge: "muted",   dot: "bg-[#5A6478]" },
    alert:    { badge: "warning", dot: "bg-[#D97706]" },
  };

  const typeLabels: Record<string, string> = {
    approve: "Aprovação", reject: "Rejeição", edit: "Edição",
    create: "Criação", system: "Sistema", alert: "Alerta",
  };

  const filtered = AUDIT_LOG.filter((l) => {
    if (filterType !== "all" && l.type !== filterType) return false;
    if (search && !l.detail.toLowerCase().includes(search.toLowerCase()) && !l.user.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <SectionHeader title="Log de Auditoria" subtitle="Registo imutável de todas as acções do sistema" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por acção ou utilizador..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-1">
          {["all", "approve", "reject", "edit", "create", "system", "alert"].map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? "bg-accent text-white" : "border border-border text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "Todos" : typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Data / Hora", "Utilizador", "Acção", "Módulo", "Detalhe", "Tipo"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.ts}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-bold text-muted-foreground">{log.user === "Sistema" ? "S" : log.user.split(" ").map((w) => w[0]).join("")}</span>
                      </div>
                      <span className="text-xs font-medium text-foreground whitespace-nowrap">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{log.action}</td>
                  <td className="px-4 py-3"><Badge variant="muted">{log.entity}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">{log.detail}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${typeStyles[log.type]?.dot}`} />
                      <Badge variant={typeStyles[log.type]?.badge as any}>{typeLabels[log.type]}</Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/10 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} entradas</span>
          <button className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"><Download size={12} />Exportar CSV</button>
        </div>
      </Card>
    </div>
  );
}

// ─── Account Profile Page ─────────────────────────────────────────────────────

function AccountProfilePage({ role }: { role: Role }) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "privacy">("profile");
  const [email, setEmail] = useState(role === "admin" ? "miguel.silva@sgde.pt" : "fabio.lopes@sgde.pt");
  const [name, setName] = useState(role === "admin" ? "Miguel Silva" : "Fábio Lopes");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="max-w-2xl">
      <SectionHeader title="A Minha Conta" subtitle="Gerir dados pessoais, segurança e privacidade" />
      <div className="flex gap-1 border-b border-border mb-6">
        {([{ id: "profile", label: "Perfil" }, { id: "security", label: "Segurança" }, { id: "privacy", label: "Privacidade & RGPD" }] as const).map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
        ))}
      </div>
      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Dados Pessoais</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Nome completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"><Save size={14} />Guardar Alterações</button>
          </Card>
          {role === "staff" && (
            <Card className="p-5 border-[#D97706]/30 bg-[#FEF9EC]/50">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={16} className="text-[#D97706] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Registo Criminal</h3>
                  <p className="text-xs text-[#D97706] mt-0.5">O seu registo criminal expira em 15 Mar 2026. Submeta um novo documento.</p>
                </div>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-colors mb-3">
                <Upload size={16} className="text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Clique para submeter novo registo criminal</p>
                  <p className="text-xs text-muted-foreground/60">PDF, JPG · Max 5MB</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Data de Validade</label>
                <DatePicker value="" onChange={() => {}} className="w-full" />
              </div>
            </Card>
          )}
        </div>
      )}
      {activeTab === "security" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alterar Password</h3>
          <div className="space-y-3">
            {["Password Atual", "Nova Password", "Confirmar Nova Password"].map((l) => (
              <div key={l}>
                <label className="text-xs text-muted-foreground block mb-1.5">{l}</label>
                <input type="password" placeholder="••••••••" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            ))}
          </div>
          <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"><Shield size={14} />Atualizar Password</button>
        </Card>
      )}
      {activeTab === "privacy" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Direito ao Esquecimento (RGPD)</h3>
            <p className="text-xs text-muted-foreground mb-4">Solicitar a eliminação de todos os dados pessoais. Esta operação é irreversível e sujeita a análise.</p>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors"><XCircle size={14} />Solicitar Eliminação de Dados</button>
          </Card>
          <Card className="p-5 border-destructive/20">
            <h3 className="text-sm font-semibold text-foreground mb-2">Eliminar Conta</h3>
            <p className="text-xs text-muted-foreground mb-4">Elimina permanentemente esta conta e todos os dados associados. Irreversível.</p>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"><X size={14} />Eliminar Conta</button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-[#C8291A] font-medium">Tem a certeza?</p>
                <button className="px-3 py-1.5 rounded bg-destructive text-white text-xs font-medium">Confirmar</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground">Cancelar</button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Gantt Page ──────────────────────────────────────────────────────────────

function GanttPage() {
  const [tooltip, setTooltip] = useState<{ task: { name: string; phaseName: string; phaseColor: string; start: number; end: number; members: number[] }; x: number; y: number } | null>(null);

  // Sep 14 → Nov 15 = 62 days
  const TOTAL_DAYS = 62;
  const START_DATE = new Date(2026, 8, 14);

  const TEAM = [
    { id: 1, name: "Pedro Costa",  initials: "PC", color: "#6366F1", role: "Full-stack / Laravel Lead" },
    { id: 2, name: "Bruno Silva",  initials: "BS", color: "#EC4899", role: "Full-stack / React Lead" },
    { id: 3, name: "Nuno Alves",   initials: "NA", color: "#06B6D4", role: "Backend Developer" },
    { id: 4, name: "Jorge Nunes",  initials: "JN", color: "#F59E0B", role: "Frontend Developer" },
  ];

  type Task = { name: string; start: number; end: number; members: number[] };
  type Phase = { id: string; name: string; color: string; tasks: Task[] };

  const PHASES: Phase[] = [
    {
      id: "infra", name: "Setup & Infraestrutura", color: "#6366F1",
      tasks: [
        { name: "Configuração de ambientes (dev/staging/prod)", start: 0,  end: 4,  members: [1,2,3,4] },
        { name: "Schema BD & Modelação de dados",               start: 0,  end: 7,  members: [1,3]     },
        { name: "CI/CD Pipeline & deploy automático",           start: 3,  end: 7,  members: [1,2]     },
      ],
    },
    {
      id: "auth", name: "Autenticação & Utilizadores", color: "#A855F7",
      tasks: [
        { name: "API: Auth JWT + Roles & Permissões",    start: 5,  end: 14, members: [1,3]   },
        { name: "UI: Login, Recuperar Password",          start: 5,  end: 11, members: [2,4]   },
        { name: "API: CRUD Utilizadores + Perfis",        start: 10, end: 18, members: [3]     },
        { name: "UI: Perfil & Configurações de Conta",   start: 11, end: 18, members: [4]     },
      ],
    },
    {
      id: "entities", name: "Escolas & Assistentes", color: "#06B6D4",
      tasks: [
        { name: "API: CRUD Escolas",                          start: 7,  end: 17, members: [3]   },
        { name: "UI: Gestão de Escolas",                      start: 14, end: 24, members: [4]   },
        { name: "API: CRUD Assistentes + Exceções",           start: 10, end: 24, members: [1]   },
        { name: "UI: Listagem & Formulário de Assistentes",   start: 17, end: 28, members: [2]   },
      ],
    },
    {
      id: "motor", name: "Motor de Regras", color: "#F59E0B",
      tasks: [
        { name: "API: Regras de Horário + Vigências",         start: 17, end: 28, members: [1,3] },
        { name: "UI: ConfigEngine (formulários de regras)",   start: 21, end: 35, members: [2,4] },
        { name: "Algoritmo de geração de escalas",            start: 24, end: 36, members: [1]   },
      ],
    },
    {
      id: "mapa", name: "Mapa de Escalas", color: "#00B884",
      tasks: [
        { name: "API: Endpoints mapa (dia / semana / mês)",   start: 28, end: 38, members: [1,3] },
        { name: "UI: Vistas Dia / Semana / Mês",              start: 28, end: 42, members: [2,4] },
        { name: "UI: Edição de blocos (drag & click)",        start: 35, end: 46, members: [2]   },
        { name: "API: Validações & deteção de sobreposições", start: 38, end: 46, members: [1]   },
      ],
    },
    {
      id: "ausencias", name: "Ausências & Transferências", color: "#EC4899",
      tasks: [
        { name: "API: Gestão de Ausências",              start: 35, end: 46, members: [3]   },
        { name: "API: Sistema de Transferências",         start: 38, end: 49, members: [1]   },
        { name: "UI: Ausências & calendário de faltas",  start: 42, end: 53, members: [4]   },
        { name: "UI: Pedidos de Transferência",           start: 46, end: 53, members: [2]   },
      ],
    },
    {
      id: "reports", name: "Relatórios & Exportação", color: "#10B981",
      tasks: [
        { name: "API: Relatórios + exportação PDF / Excel", start: 46, end: 56, members: [1,3] },
        { name: "UI: Página Relatórios + filtros",          start: 49, end: 58, members: [2,4] },
      ],
    },
    {
      id: "qa", name: "QA & Testes", color: "#EF4444",
      tasks: [
        { name: "Testes funcionais & E2E",        start: 49, end: 58, members: [2,4]     },
        { name: "Correção de bugs & estabilização", start: 53, end: 60, members: [1,2,3,4] },
      ],
    },
    {
      id: "deploy", name: "Deploy & Entrega", color: "#8B5CF6",
      tasks: [
        { name: "Deploy staging + testes UAT", start: 58, end: 61, members: [1,2,3,4] },
        { name: "Go-live produção",             start: 61, end: 62, members: [1]       },
      ],
    },
  ];

  // Week tick marks
  const weeks: { day: number; label: string }[] = [];
  for (let d = 0; d <= TOTAL_DAYS; d += 7) {
    const dt = new Date(START_DATE);
    dt.setDate(dt.getDate() + d);
    const day = dt.getDate();
    const mon = dt.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
    weeks.push({ day: d, label: `${day} ${mon}` });
  }

  const xPct = (d: number) => `${(d / TOTAL_DAYS) * 100}%`;
  const wPct = (s: number, e: number) => `${((e - s) / TOTAL_DAYS) * 100}%`;

  // Total sprint count per team member
  const memberStats = TEAM.map((m) => {
    const tasks = PHASES.flatMap((p) => p.tasks.filter((t) => t.members.includes(m.id)));
    const phases = new Set(PHASES.filter((p) => p.tasks.some((t) => t.members.includes(m.id))).map((p) => p.id));
    return { ...m, taskCount: tasks.length, phaseCount: phases.size };
  });

  return (
    <div className="space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa de Gantt — SGDE</h1>
          <p className="text-sm text-muted-foreground mt-0.5">4 pessoas · 14 Set → 15 Nov 2026 · 9 sprints quinzenais</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TEAM.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</div>
              <span className="text-xs text-muted-foreground">{m.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <div style={{ minWidth: 780 }}>
          {/* Column header */}
          <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
            <div className="w-60 flex-shrink-0 px-4 py-2.5 border-r border-border/50">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Fase / Tarefa</span>
            </div>
            <div className="flex-1 relative px-2 py-2">
              {weeks.map((w) => (
                <div key={w.day} className="absolute top-0 flex flex-col items-start h-full" style={{ left: xPct(w.day) }}>
                  <span className="text-[9px] font-medium text-muted-foreground/70 pl-1 pt-1.5">{w.label}</span>
                  <div className="flex-1 w-px bg-border/30 mt-1 ml-1" />
                </div>
              ))}
              {/* Today marker header */}
              <div className="absolute top-0 bottom-0 flex flex-col items-center z-20" style={{ left: xPct(0) }}>
                <span className="text-[9px] font-bold text-destructive bg-destructive/10 rounded px-1 mt-1">Hoje</span>
                <div className="flex-1 w-0.5 bg-destructive/60 mt-0.5" />
              </div>
            </div>
          </div>

          {/* Phase rows */}
          {PHASES.map((phase) => {
            const phaseStart = Math.min(...phase.tasks.map((t) => t.start));
            const phaseEnd   = Math.max(...phase.tasks.map((t) => t.end));
            return (
              <div key={phase.id}>
                {/* Phase header row */}
                <div className="flex border-b border-border/40" style={{ backgroundColor: phase.color + "0C" }}>
                  <div className="w-60 flex-shrink-0 px-4 py-2 border-r border-border/50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />
                    <span className="text-[11px] font-semibold text-foreground">{phase.name}</span>
                  </div>
                  <div className="flex-1 relative px-2">
                    {/* Phase span background */}
                    <div className="absolute inset-y-1.5 rounded" style={{
                      left: xPct(phaseStart), width: wPct(phaseStart, phaseEnd),
                      backgroundColor: phase.color + "22", border: `1px dashed ${phase.color}50`,
                    }} />
                    {/* Today marker */}
                    <div className="absolute inset-y-0 w-0.5 bg-destructive/40 z-10" style={{ left: xPct(0) }} />
                  </div>
                </div>

                {/* Task rows */}
                {phase.tasks.map((task, ti) => (
                  <div key={ti} className="flex border-b border-border/20 hover:bg-muted/20 transition-colors group">
                    <div className="w-60 flex-shrink-0 px-4 pl-8 py-1.5 border-r border-border/30 flex items-center">
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate leading-tight" title={task.name}>{task.name}</span>
                    </div>
                    <div className="flex-1 relative px-2 py-1" onMouseLeave={() => setTooltip(null)}>
                      {/* Week grid lines */}
                      {weeks.map((w) => (
                        <div key={w.day} className="absolute inset-y-0 w-px bg-border/20" style={{ left: xPct(w.day) }} />
                      ))}
                      {/* Today marker */}
                      <div className="absolute inset-y-0 w-0.5 bg-destructive/40 z-10" style={{ left: xPct(0) }} />
                      {/* Task bar */}
                      <div
                        className="absolute inset-y-1 rounded-md cursor-pointer flex items-center px-1.5 gap-0.5 overflow-hidden transition-opacity hover:opacity-80"
                        style={{ left: xPct(task.start), width: wPct(task.start, task.end), backgroundColor: phase.color }}
                        onMouseEnter={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({ task: { ...task, phaseName: phase.name, phaseColor: phase.color }, x: r.left, y: r.top });
                        }}
                      >
                        {task.members.map((mid) => {
                          const m = TEAM.find((t) => t.id === mid)!;
                          return (
                            <div key={mid} className="w-3.5 h-3.5 rounded-full border border-white/40 flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-white"
                              style={{ backgroundColor: m.color }} title={m.name}>
                              {m.initials[0]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Sprint footer */}
          <div className="flex border-t border-border bg-muted/20">
            <div className="w-60 flex-shrink-0 px-4 py-2 border-r border-border/50">
              <span className="text-[10px] text-muted-foreground">62 dias · 9 fases</span>
            </div>
            <div className="flex-1 relative px-2 py-1.5">
              {[0, 14, 28, 42, 56].map((d, i) => d < TOTAL_DAYS ? (
                <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: xPct(d), width: wPct(d, Math.min(d + 14, TOTAL_DAYS)) }}>
                  <span className="text-[9px] text-muted-foreground/50 pl-2">Sprint {i + 1}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      </div>

      {/* Team summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {memberStats.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: m.color }}>{m.initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.role}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-display font-semibold text-foreground">{m.taskCount}</p>
                <p className="text-[10px] text-muted-foreground">tarefas</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-display font-semibold text-foreground">{m.phaseCount}</p>
                <p className="text-[10px] text-muted-foreground">fases</p>
              </div>
            </div>
            {/* Mini color bar per phase */}
            <div className="flex gap-0.5 h-1.5">
              {PHASES.filter((p) => p.tasks.some((t) => t.members.includes(m.id))).map((p) => (
                <div key={p.id} className="flex-1 rounded-full" style={{ backgroundColor: p.color }} title={p.name} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Fases do projeto</p>
        <div className="flex flex-wrap gap-3">
          {PHASES.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-xl shadow-xl p-3.5 pointer-events-none"
          style={{ top: tooltip.y - 8, left: tooltip.x + 12, transform: "translateY(-100%)", maxWidth: 280 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: tooltip.task.phaseColor }} />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{tooltip.task.phaseName}</p>
          </div>
          <p className="text-xs font-semibold text-foreground mb-2 leading-tight">{tooltip.task.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tooltip.task.members.map((mid) => {
              const m = TEAM.find((t) => t.id === mid)!;
              return (
                <div key={mid} className="flex items-center gap-1 bg-muted/50 rounded-full px-1.5 py-0.5">
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.initials[0]}</div>
                  <span className="text-[10px] text-muted-foreground">{m.name.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Dia {tooltip.task.start + 1} → {tooltip.task.end} · {tooltip.task.end - tooltip.task.start} dias
          </p>
        </div>
      )}
    </div>
  );
}

// Primary nav shown in mobile bottom bar (max 5)
const ADMIN_NAV_PRIMARY: { id: AdminPage; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: "dashboard",  label: "Escalas",      icon: <Home size={16} /> },
  { id: "assistants", label: "Assistentes",  icon: <Users size={16} /> },
  { id: "absences",   label: "Ausências",    icon: <Inbox size={16} />, badge: 3 },
  { id: "reports",    label: "Relatórios",   icon: <BarChart2 size={16} /> },
];

// Full nav in sidebar — ordered by expected access frequency (descending)
const ADMIN_NAV: { id: AdminPage; label: string; icon: React.ReactNode; badge?: number; group?: string }[] = [
  // Diário
  { id: "dashboard",  label: "Escalas",          icon: <Home size={16} />,      group: "Diário" },
  { id: "assistants", label: "Assistentes",       icon: <Users size={16} />,     group: "Diário" },
  { id: "absences",   label: "Ausências",         icon: <Inbox size={16} />,     badge: 3, group: "Diário" },
  // Análise
  { id: "reports",    label: "Relatórios",        icon: <BarChart2 size={16} />,  group: "Análise" },
  { id: "gantt",      label: "Mapa de Gantt",     icon: <GanttChart size={16} />, group: "Análise" },
  // Configuração da escola
  { id: "config",     label: "Regras do Motor",   icon: <Settings size={16} />,  group: "Configuração" },
];

// ─── School Context Bar ───────────────────────────────────────────────────────

function SchoolSwitcher({
  selectedSchoolId,
  onSelectSchool,
  onPlatformSettings,
}: {
  selectedSchoolId: number;
  onSelectSchool: (id: number) => void;
  onPlatformSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const school = SCHOOLS.find((s) => s.id === selectedSchoolId)!;
  const activeSchools = SCHOOLS.filter((s) => s.active);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors max-w-[220px]"
      >
        <span className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center flex-shrink-0">
          <Building2 size={13} className="text-primary" />
        </span>
        <span className="text-xs font-medium text-foreground truncate hidden sm:block">{school.name}</span>
        <ChevronDown size={13} className={`flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-72">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Selecionar Escola</p>
              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1"><Globe size={10} />{AGRUPAMENTO.name}</p>
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {activeSchools.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onSelectSchool(s.id); setOpen(false); }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left ${s.id === selectedSchoolId ? "bg-primary/5" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${s.id === selectedSchoolId ? "bg-primary/15" : "bg-muted"}`}>
                    <Building2 size={13} className={s.id === selectedSchoolId ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${s.id === selectedSchoolId ? "text-primary" : "text-foreground"}`}>{s.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={9} />{s.address}
                    </p>
                  </div>
                  {s.id === selectedSchoolId && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1.5">
                      <Check size={9} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border px-2 py-1.5">
              <button
                onClick={() => { onPlatformSettings(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Settings size={13} />
                Gerir escolas e plataforma
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Header avatar / account menu ─────────────────────────────────────────────

function AvatarMenu({
  name,
  role,
  onAccount,
  onPlatformSettings,
  onSwitchRole,
  onLogout,
}: {
  name: string;
  role: string;
  onAccount?: () => void;
  onPlatformSettings?: () => void;
  onSwitchRole: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 hover:bg-muted transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-primary-foreground font-mono">{initials}</span>
        </span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-60">
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-primary-foreground font-mono">{initials}</span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground">{role}</p>
              </div>
            </div>
            <div className="py-1.5">
              {onAccount && (
                <button onClick={() => { onAccount(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  <User size={15} className="text-muted-foreground" /> A Minha Conta
                </button>
              )}
              {onPlatformSettings && (
                <button onClick={() => { onPlatformSettings(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                  <Settings size={15} className="text-muted-foreground" /> Configurações da Plataforma
                </button>
              )}
              <button onClick={() => { onSwitchRole(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                <Users size={15} className="text-muted-foreground" /> {role === "Administrador" ? "Ver como Assistente" : "Vista Admin"}
              </button>
            </div>
            <div className="border-t border-border py-1.5">
              <button onClick={() => { onLogout(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut size={15} /> Terminar Sessão
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Platform Settings Page ───────────────────────────────────────────────────

function PlatformSettingsPage() {
  const [tab, setTab] = useState<"schools" | "absence-types">("schools");

  // ── Schools state ─────────────────────────────────────────────────────────
  const [schools, setSchools] = useState(SCHOOLS.map((s) => ({ ...s })));
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [schoolEditId, setSchoolEditId] = useState<number | null>(null);
  const [schoolDeleteConfirm, setSchoolDeleteConfirm] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");

  function openAddSchool() { setSchoolName(""); setSchoolAddress(""); setSchoolPhone(""); setSchoolEditId(null); setShowSchoolForm(true); }
  function openEditSchool(s: typeof schools[0]) { setSchoolName(s.name); setSchoolAddress(s.address); setSchoolPhone(s.phone); setSchoolEditId(s.id); setShowSchoolForm(true); }
  function handleSaveSchool() {
    if (!schoolName.trim()) return;
    if (schoolEditId !== null) {
      setSchools((p) => p.map((s) => s.id === schoolEditId ? { ...s, name: schoolName, address: schoolAddress, phone: schoolPhone } : s));
    } else {
      setSchools((p) => [...p, { id: p.length + 1, name: schoolName, address: schoolAddress, phone: schoolPhone, active: true, assistants: 0 }]);
    }
    setShowSchoolForm(false);
  }
  function toggleSchoolActive(id: number) { setSchools((p) => p.map((s) => s.id === id ? { ...s, active: !s.active } : s)); }
  function deleteSchool(id: number) { setSchools((p) => p.filter((s) => s.id !== id)); setSchoolDeleteConfirm(null); }

  // ── Absence types state ───────────────────────────────────────────────────
  const [absenceTypes, setAbsenceTypes] = useState(ABSENCE_TYPES_MOCK.map((t) => ({ ...t })));
  const [showATForm, setShowATForm] = useState(false);
  const [atEditId, setAtEditId] = useState<number | null>(null);
  const [atDeleteConfirm, setAtDeleteConfirm] = useState<number | null>(null);
  const [atName, setAtName] = useState("");
  const [atRequiresDoc, setAtRequiresDoc] = useState(false);

  function openAddAT() { setAtName(""); setAtRequiresDoc(false); setAtEditId(null); setShowATForm(true); }
  function openEditAT(t: typeof absenceTypes[0]) { setAtName(t.name); setAtRequiresDoc(t.requires_document); setAtEditId(t.id); setShowATForm(true); }
  function handleSaveAT() {
    if (!atName.trim()) return;
    if (atEditId !== null) {
      setAbsenceTypes((p) => p.map((t) => t.id === atEditId ? { ...t, name: atName, requires_document: atRequiresDoc } : t));
    } else {
      setAbsenceTypes((p) => [...p, { id: Math.max(...p.map((t) => t.id)) + 1, name: atName, requires_document: atRequiresDoc }]);
    }
    setShowATForm(false);
  }
  function deleteAT(id: number) { setAbsenceTypes((p) => p.filter((t) => t.id !== id)); setAtDeleteConfirm(null); }

  const TABS = [
    { id: "schools" as const,        label: "Escolas",         icon: <Building2 size={14} /> },
    { id: "absence-types" as const,  label: "Tipos de Falta",  icon: <FileText size={14} /> },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings size={16} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Configurações da Plataforma</h2>
      </div>
      <p className="text-sm text-muted-foreground ml-10 mb-6">Gestão do agrupamento, escolas e parametrizações do sistema</p>

      {/* Agrupamento card */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{AGRUPAMENTO.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{AGRUPAMENTO.code}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          {[
            { label: "Escolas Ativas",  value: schools.filter((s) => s.active).length },
            { label: "Total Escolas",   value: schools.length },
            { label: "Assistentes",     value: schools.reduce((a, s) => a + s.assistants, 0) },
          ].map((kpi) => (
            <div key={kpi.label} className="text-center">
              <p className="text-xl font-mono font-bold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Escolas ── */}
      {tab === "schools" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Escolas do Agrupamento</h3>
            <button onClick={openAddSchool} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors">
              <Plus size={13} />Nova Escola
            </button>
          </div>
          <div className="space-y-3">
            {schools.map((school) => (
              <div key={school.id} className={`p-4 rounded-xl border transition-colors ${school.active ? "border-border bg-card" : "border-border/50 bg-muted/20"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${school.active ? "bg-primary/10" : "bg-muted"}`}>
                    <Building2 size={16} className={school.active ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${school.active ? "text-foreground" : "text-muted-foreground"}`}>{school.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${school.active ? "bg-[#0E7C59]/10 text-[#0E7C59]" : "bg-muted text-muted-foreground"}`}>
                        {school.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><MapPin size={10} /><span className="truncate">{school.address}</span></div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span>{school.phone}</span>
                      <span>{school.assistants} assistente{school.assistants !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEditSchool(school)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Editar"><Pencil size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => toggleSchoolActive(school.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title={school.active ? "Desativar" : "Ativar"}>
                      {school.active ? <XCircle size={13} className="text-muted-foreground" /> : <CheckCircle size={13} className="text-muted-foreground" />}
                    </button>
                    {schoolDeleteConfirm === school.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteSchool(school.id)} className="px-2 py-1 rounded bg-destructive text-white text-[10px] font-medium">Confirmar</button>
                        <button onClick={() => setSchoolDeleteConfirm(null)} className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setSchoolDeleteConfirm(school.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Eliminar">
                        <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showSchoolForm && (
            <Modal title={schoolEditId !== null ? "Editar Escola" : "Nova Escola"} subtitle="Dados de identificação da escola" onClose={() => setShowSchoolForm(false)}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Nome da Escola *</label>
                  <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Ex: EB1 Quinta das Flores" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Morada</label>
                  <input type="text" value={schoolAddress} onChange={(e) => setSchoolAddress(e.target.value)} placeholder="Rua, número, localidade" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Telefone</label>
                  <input type="tel" value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} placeholder="213 000 000" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveSchool} disabled={!schoolName.trim()} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                    {schoolEditId !== null ? "Guardar Alterações" : "Criar Escola"}
                  </button>
                  <button onClick={() => setShowSchoolForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}

      {/* ── Tab: Tipos de Falta ── */}
      {tab === "absence-types" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tipos de Falta</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Categorias utilizadas no registo de ausências</p>
            </div>
            <button onClick={openAddAT} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors">
              <Plus size={13} />Novo Tipo
            </button>
          </div>
          <div className="space-y-2">
            {absenceTypes.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t.requires_document
                      ? <span className="flex items-center gap-1"><Paperclip size={10} />Requer documento comprovativo</span>
                      : "Sem documento obrigatório"}
                  </p>
                </div>
                {atDeleteConfirm === t.id ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => deleteAT(t.id)} className="px-2 py-1 rounded bg-destructive text-white text-[10px] font-medium">Confirmar</button>
                    <button onClick={() => setAtDeleteConfirm(null)} className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditAT(t)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Editar"><Pencil size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => setAtDeleteConfirm(t.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Eliminar"><Trash2 size={13} className="text-muted-foreground hover:text-destructive" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showATForm && (
            <Modal title={atEditId !== null ? "Editar Tipo de Falta" : "Novo Tipo de Falta"} subtitle="Parametrização do tipo de ausência" onClose={() => setShowATForm(false)}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Nome *</label>
                  <input type="text" value={atName} onChange={(e) => setAtName(e.target.value)} placeholder="Ex: Consulta Médica" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">Requer documento comprovativo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ativa o upload obrigatório no registo da falta</p>
                  </div>
                  <button
                    onClick={() => setAtRequiresDoc((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${atRequiresDoc ? "bg-accent" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${atRequiresDoc ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveAT} disabled={!atName.trim()} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors">
                    {atEditId !== null ? "Guardar Alterações" : "Criar Tipo"}
                  </button>
                  <button onClick={() => setShowATForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared Sidebar Content ───────────────────────────────────────────────────

function SidebarContent({
  page,
  onNavigate,
  onSwitchRole,
  onLogout,
}: {
  page: AdminPage;
  onNavigate: (p: AdminPage) => void;
  onSwitchRole: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo — temporary placeholder mark */}
      <div className="px-5 h-16 flex items-center border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/30">
            <Layers size={18} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground tracking-tight leading-none" style={{ fontFamily: "var(--font-display)" }}>SGDE</p>
            <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-1">Gestão de Escalas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {["Diário", "Análise", "Configuração"].map((group) => {
          const items = ADMIN_NAV.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <p className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">{group}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`group relative w-full flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />}
                      <span className={`flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}>{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-mono font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — user card */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={() => onNavigate("account" as AdminPage)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${page === "account" ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}
        >
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-primary font-mono">MS</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-foreground truncate">Miguel Silva</p>
            <p className="text-[10px] text-muted-foreground">Administrador</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
        </button>
      </div>
    </>
  );
}

function AdminLayout({ onSwitchRole, onLogout, initialPage = "dashboard" }: { onSwitchRole: () => void; onLogout: () => void; initialPage?: AdminPage }) {
  const [page, setPage] = useState<AdminPage>(initialPage);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(null);
  const [absenceFor, setAbsenceFor] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState(1);
  const [dark, setDark] = useDarkMode();

  const selectedSchool = SCHOOLS.find((s) => s.id === selectedSchoolId)!;

  const unreadCount = notifications.filter((n) => !n.read).length;

  function navigate(p: AdminPage) { setPage(p); setMobileMenuOpen(false); }
  function markRead(id: number) { setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)); }
  function markAllRead() { setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent page={page} onNavigate={navigate} onSwitchRole={onSwitchRole} onLogout={onLogout} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="fixed left-0 top-0 h-full w-64 z-50 bg-sidebar border-r border-sidebar-border flex flex-col lg:hidden shadow-2xl"
            style={{ animation: "slideInLeft 200ms ease-out" }}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-5 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
            <SidebarContent page={page} onNavigate={navigate} onSwitchRole={onSwitchRole} onLogout={onLogout} />
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between flex-shrink-0 gap-3">
          {/* Left: hamburger (mobile) + breadcrumb + school switcher */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — only on mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Menu size={18} className="text-muted-foreground" />
            </button>

            {/* Desktop: breadcrumb */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <Home size={15} className="text-muted-foreground" />
              <ChevronRight size={13} className="text-muted-foreground/50" />
              <span className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "var(--font-display)" }}>
                {ADMIN_NAV.find((n) => n.id === page)?.label ?? (page === "profile" ? "Perfil do Assistente" : page === "add-assistant" ? "Novo Assistente" : page === "platform-settings" ? "Configurações da Plataforma" : page === "account" ? "A Minha Conta" : page)}
              </span>
            </div>

            <div className="hidden md:block h-5 w-px bg-border" />

            {/* School switcher */}
            <SchoolSwitcher
              selectedSchoolId={selectedSchoolId}
              onSelectSchool={(id) => setSelectedSchoolId(id)}
              onPlatformSettings={() => navigate("platform-settings")}
            />
          </div>

          {/* Right: search + controls + avatar */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Search */}
            <button className="hidden lg:flex items-center gap-2 pl-3 pr-2 py-2 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground transition-colors mr-1">
              <Search size={14} />
              <span className="text-xs">Pesquisar</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-card border border-border">Ctrl K</span>
            </button>

            <HeaderIcon title="Idiomas" className="hidden sm:flex"><Languages size={17} /></HeaderIcon>
            <HeaderIcon onClick={toggleFullscreen} title="Ecrã inteiro" className="hidden md:flex"><Maximize2 size={16} /></HeaderIcon>
            <HeaderIcon onClick={() => setDark(!dark)} title={dark ? "Modo claro" : "Modo escuro"}>
              {dark ? <Sun size={17} /> : <Moon size={16} />}
            </HeaderIcon>

            <div className="relative">
              <HeaderIcon onClick={() => setShowNotifs((v) => !v)} title="Notificações">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-mono flex items-center justify-center px-0.5 ring-2 ring-card">
                    {unreadCount}
                  </span>
                )}
              </HeaderIcon>
              {showNotifs && (
                <NotificationsDropdown
                  notifications={notifications}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onClose={() => setShowNotifs(false)}
                />
              )}
            </div>

            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

            <AvatarMenu
              name="Miguel Silva"
              role="Administrador"
              onAccount={() => navigate("account")}
              onPlatformSettings={() => navigate("platform-settings")}
              onSwitchRole={onSwitchRole}
              onLogout={onLogout}
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {page === "dashboard" && (
            <DashboardSection onSelectAssistant={(id) => setSelectedAssistantId(id)} currentSchoolId={selectedSchoolId} />
          )}
          {page === "config" && <ConfigEngine />}
          {page === "profile" && <AssistantProfile onBack={() => navigate("assistants")} />}
          {page === "absences" && <AbsenceManagement />}
          {page === "assistants" && (
            <AssistantesPageWrapper
              onViewProfile={() => navigate("profile")}
            />
          )}
          {page === "add-assistant" && <AssistantesPageWrapper onViewProfile={() => navigate("profile")} />}
          {page === "reports" && <RelatoriosPage />}
          {page === "gantt" && <GanttPage />}
          {page === "account" && <AccountProfilePage role="admin" />}
          {page === "platform-settings" && <PlatformSettingsPage />}
        </div>

        {/* Assistant Day Modal */}
        {selectedAssistantId !== null && (
          <AssistantDayModal
            assistantId={selectedAssistantId}
            onClose={() => setSelectedAssistantId(null)}
            onViewProfile={() => { setSelectedAssistantId(null); navigate("profile"); }}
            onMarkAbsence={(name) => { setSelectedAssistantId(null); setAbsenceFor(name); }}
          />
        )}
        {absenceFor !== null && (
          <QuickAbsenceModal assistantName={absenceFor} onClose={() => setAbsenceFor(null)} currentSchoolId={selectedSchoolId} />
        )}
      </main>

      {/* ── Mobile bottom nav (visible only on mobile) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center">
        {ADMIN_NAV_PRIMARY.map((item) => (
          <button key={item.id} onClick={() => navigate(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${page === item.id ? "text-accent" : "text-muted-foreground"}`}>
            <span className="relative">
              {item.icon}
              {item.badge && <span className="absolute -top-1 -right-1.5 bg-[#C8291A] text-white text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono">{item.badge}</span>}
            </span>
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            {page === item.id && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
        <button onClick={() => setMobileMenuOpen(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors text-muted-foreground hover:text-foreground`}>
          <Menu size={16} />
          <span className="text-[9px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Mobile bottom nav spacer */}
      <div className="lg:hidden h-16 flex-shrink-0" />
    </div>
  );
}

// ─── Staff: My Schedule (multi-view) ─────────────────────────────────────────

type StaffViewMode = "day" | "week" | "month";

const STAFF_MONTH_MONTHS = [
  { label: "Janeiro 2026",  days: 31, firstDow: 2, firstOffset: -26 },
  { label: "Fevereiro 2026",days: 28, firstDow: 5, firstOffset: 5  },
  { label: "Março 2026",    days: 31, firstDow: 5, firstOffset: 33 },
];

function staffBlocksForDay(dayOffset: number) {
  const matrix = generateDayMatrix(dayOffset);
  const slots = matrix[6]; // Fábio Lopes = assistant id 6
  const groups: { state: BlockState; start: number; end: number }[] = [];
  let cur: { state: BlockState; start: number; end: number } | null = null;
  slots.forEach((s, i) => {
    if (s === "off") { if (cur) { groups.push(cur); cur = null; } return; }
    if (cur && cur.state === s) { cur.end = i; }
    else { if (cur) groups.push(cur); cur = { state: s, start: i, end: i }; }
  });
  if (cur) groups.push(cur);
  return { slots, groups };
}

const STAFF_BLOCK_COLORS: Record<BlockState, string> = {
  work: "bg-accent/10 border-l-accent text-accent",
  surveillance: "bg-[#7C3AED]/10 border-l-[#7C3AED] text-[#7C3AED]",
  lunch: "bg-[#D97706]/10 border-l-[#D97706] text-[#D97706]",
  absent: "bg-destructive/10 border-l-destructive text-destructive",
  off: "bg-muted border-l-border text-muted-foreground",
};
const STAFF_BLOCK_ICONS: Record<BlockState, React.ReactNode> = {
  work: <Clock size={16} />, surveillance: <Eye size={16} />, lunch: <Coffee size={16} />,
  absent: <UserX size={16} />, off: null,
};

function StaffDayView({ dayOffset }: { dayOffset: number }) {
  const info = getDateInfo(dayOffset);
  const { slots, groups } = staffBlocksForDay(dayOffset);
  const isWeekend = info.dow >= 5;
  const isToday = dayOffset === 0;
  const entryGroup = groups.find((g) => g.state !== "off");
  const lastGroup = [...groups].reverse().find((g) => g.state !== "off");

  return (
    <div className="pt-4">
      {isToday && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: "45%" }} />
          </div>
          <span className="text-xs font-mono text-muted-foreground">4h 00min restantes</span>
        </div>
      )}
      {isWeekend ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🌿</p>
          <p className="text-sm font-medium text-foreground">Dia de Folga</p>
          <p className="text-xs text-muted-foreground mt-1">{info.dayName}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Entrada", value: entryGroup ? TIME_SLOTS[entryGroup.start] : "—" },
              { label: "Saída",   value: lastGroup ? (TIME_SLOTS[lastGroup.end + 1] || "24:00") : "—" },
              { label: "Carga",   value: "6h" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-base font-mono font-semibold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem blocos activos</p>
            ) : groups.map((block, i) => {
              const startTime = TIME_SLOTS[block.start];
              const endTime = TIME_SLOTS[block.end + 1] || "24:00";
              const dMin = (block.end - block.start + 1) * 15;
              const dStr = dMin >= 60 ? `${Math.floor(dMin / 60)}h${dMin % 60 > 0 ? ` ${dMin % 60}min` : ""}` : `${dMin}min`;
              return (
                <div key={i} className={`border-l-4 rounded-r-xl px-4 py-3 ${STAFF_BLOCK_COLORS[block.state]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">{STAFF_BLOCK_ICONS[block.state]}<span className="text-sm font-semibold">{BLOCK_STYLES[block.state].label}</span></div>
                    <span className="text-xs font-mono opacity-70">{dStr}</span>
                  </div>
                  <p className="text-xs font-mono mt-1 opacity-60">{startTime} – {endTime}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StaffWeekView({ weekStart, onSelectDay }: { weekStart: number; onSelectDay: (o: number) => void }) {
  const offsets = Array.from({ length: 7 }, (_, i) => weekStart + i);
  return (
    <div className="pt-2 pb-4 space-y-2">
      {offsets.map((offset) => {
        const info = getDateInfo(offset);
        const isToday = offset === 0;
        const isWeekend = info.dow >= 5;
        const { slots } = staffBlocksForDay(offset);
        const hasWork = slots.some((s) => s !== "off");
        const hasAbsent = slots.every((s) => s === "absent");
        return (
          <button
            key={offset}
            onClick={() => !isWeekend && onSelectDay(offset)}
            className={`w-full text-left rounded-xl border p-3 transition-colors
              ${isToday ? "border-accent bg-accent/5" : isWeekend ? "border-border bg-muted/20 opacity-50" : "border-border bg-card hover:border-accent/40 hover:bg-accent/3"}
              ${isWeekend ? "cursor-default" : "cursor-pointer"}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isToday ? "text-accent" : "text-foreground"}`}>{info.dayShort}</span>
                <span className={`text-xs font-mono ${isToday ? "text-accent" : "text-muted-foreground"}`}>{info.dateStr}</span>
                {isToday && <Badge variant="default">Hoje</Badge>}
              </div>
              {!isWeekend && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {hasAbsent ? "Ausência" : hasWork ? "6h" : "Folga"}
                </span>
              )}
            </div>
            {!isWeekend && (
              <div className="relative h-4 rounded-sm overflow-hidden bg-muted/30">
                {slotsToBlocks(slots).map((b) => {
                  const cs = Math.max(b.start, VIEW_START);
                  const ce = Math.min(b.start + b.count, VIEW_END);
                  if (b.state === "off" || ce <= cs) return null;
                  return (
                    <div
                      key={b.start}
                      className={`absolute inset-y-1 rounded-md ${BLOCK_STYLES[b.state].bg} opacity-75 overflow-hidden`}
                      style={{ left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`, width: `${((ce - cs) / VIEW_SLOTS) * 100}%` }}
                    >
                      {BLOCK_STYLES[b.state].locked && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Lock size={6} className="text-white/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StaffMonthView({ monthOffset, onSelectDay, onChangeMonth }: { monthOffset: number; onSelectDay: (o: number) => void; onChangeMonth: (d: number) => void }) {
  const month = STAFF_MONTH_MONTHS[Math.max(0, Math.min(monthOffset, STAFF_MONTH_MONTHS.length - 1))];
  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onChangeMonth(-1)} disabled={monthOffset === 0} className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30"><ChevronLeft size={14} /></button>
        <span className="text-sm font-semibold text-foreground">{month.label}</span>
        <button onClick={() => onChangeMonth(1)} disabled={monthOffset >= STAFF_MONTH_MONTHS.length - 1} className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30"><ChevronRight size={14} /></button>
      </div>
      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: month.firstDow }, (_, i) => <div key={`pre-${i}`} />)}
        {Array.from({ length: month.days }, (_, i) => {
          const dayNum = i + 1;
          const offset = month.firstOffset + i;
          const dow = (month.firstDow + i) % 7;
          const isWeekend = dow >= 5;
          const isToday = offset === 0;
          const { slots } = staffBlocksForDay(offset);
          const hasWork = !isWeekend && slots.some((s) => s !== "off");
          const hasAbsent = !isWeekend && slots.every((s) => s === "absent");
          return (
            <button
              key={dayNum}
              onClick={() => !isWeekend && onSelectDay(offset)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-colors
                ${isToday ? "bg-accent text-white font-bold ring-2 ring-accent" : ""}
                ${!isToday && hasAbsent ? "bg-[#C8291A]/15 text-[#C8291A]" : ""}
                ${!isToday && hasWork ? "bg-[#1A56DB]/10 text-[#1A56DB] hover:bg-[#1A56DB]/20" : ""}
                ${!isToday && !hasWork && !hasAbsent ? isWeekend ? "text-muted-foreground/30 cursor-default" : "text-muted-foreground hover:bg-muted cursor-pointer" : ""}
              `}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {[
          { color: "bg-[#1A56DB]/20", label: "Trabalhado" },
          { color: "bg-[#C8291A]/15", label: "Ausência" },
          { color: "bg-muted/50", label: "Folga" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffScheduleSection() {
  const [viewMode, setViewMode] = useState<StaffViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const info = getDateInfo(dayOffset);

  function prevNav() {
    if (viewMode === "day") setDayOffset((d) => Math.max(d - 1, -7));
    if (viewMode === "week") setWeekStart((w) => Math.max(w - 7, -7));
    if (viewMode === "month") setMonthOffset((m) => Math.max(m - 1, 0));
  }
  function nextNav() {
    if (viewMode === "day") setDayOffset((d) => Math.min(d + 1, 35));
    if (viewMode === "week") setWeekStart((w) => Math.min(w + 7, 28));
    if (viewMode === "month") setMonthOffset((m) => Math.min(m + 1, STAFF_MONTH_MONTHS.length - 1));
  }

  function navToDay(offset: number) { setDayOffset(offset); setViewMode("day"); }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-2 pb-3 border-b border-border mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            {viewMode === "day" && (
              <>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{info.dayName}</p>
                <h1 className="text-xl font-semibold text-foreground">{info.dateStr}</h1>
              </>
            )}
            {viewMode === "week" && <h1 className="text-xl font-semibold text-foreground">Semana</h1>}
            {viewMode === "month" && <h1 className="text-xl font-semibold text-foreground">Calendário</h1>}
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["day", "week", "month"] as StaffViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {m === "day" ? "Dia" : m === "week" ? "Sem" : "Mês"}
              </button>
            ))}
          </div>
        </div>
        {/* Day/week nav */}
        {viewMode !== "month" && (
          <div className="flex items-center gap-2">
            <button onClick={prevNav} className="p-1.5 rounded border border-border hover:bg-muted transition-colors"><ChevronLeft size={14} /></button>
            <div className="flex-1 text-center">
              {viewMode === "day" && (
                <button onClick={() => navToDay(0)} className="text-xs text-accent font-medium">Hoje</button>
              )}
              {viewMode === "week" && (
                <span className="text-xs font-mono text-muted-foreground">
                  {getDateInfo(weekStart).dateStr} – {getDateInfo(weekStart + 6).dateStr}
                </span>
              )}
            </div>
            <button onClick={nextNav} className="p-1.5 rounded border border-border hover:bg-muted transition-colors"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {viewMode === "day" && <StaffDayView dayOffset={dayOffset} />}
      {viewMode === "week" && <StaffWeekView weekStart={weekStart} onSelectDay={navToDay} />}
      {viewMode === "month" && <StaffMonthView monthOffset={monthOffset} onSelectDay={navToDay} onChangeMonth={(d) => setMonthOffset((m) => Math.max(0, Math.min(m + d, STAFF_MONTH_MONTHS.length - 1)))} />}
    </div>
  );
}

// ─── Staff: Register Absence ──────────────────────────────────────────────────

const PREV_ABSENCES = [
  { dates: "18–20 Nov 2025", reason: "Doença", status: "approved" },
  { dates: "03 Out 2025", reason: "Consulta", status: "approved" },
  { dates: "14 Set 2025", reason: "Assuntos pessoais", status: "rejected" },
];

function RegisterAbsence() {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const absence = { start: "20 Jan 2026", end: "22 Jan 2026", days: 3 };

  function reset() { setSubmitted(false); setStep(1); setReason(""); setOtherReason(""); setNote(""); setFileName(""); }

  if (submitted) {
    return (
      <div className="pt-12 pb-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-[#0E7C59]" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Justificação Submetida</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          A sua justificação foi enviada e aguarda confirmação do gestor. Será notificado quando for processada.
        </p>
        <button onClick={reset} className="mt-6 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          Nova justificação
        </button>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Justificar Falta" subtitle="Indique o motivo e anexe documentação de suporte" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          <Card className="p-4 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Falta a justificar</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                <Calendar size={13} className="text-accent" />
                {absence.start} — {absence.end}
              </div>
              <Badge variant="muted">{absence.days} dias</Badge>
              <Badge variant="warning">Por justificar</Badge>
            </div>
          </Card>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Motivo *</label>
                <div className="space-y-2">
                  {["Doença", "Consulta Médica", "Licença de Casamento", "Falecimento Familiar", "Assuntos Pessoais", "Outro"].map((m) => (
                    <button key={m} onClick={() => setReason(m)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${reason === m ? "border-accent bg-accent/5 text-accent font-medium" : "border-border hover:border-accent/30 text-foreground"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {reason === "Outro" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Especifique</label>
                  <input value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Descreva o motivo..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Observação adicional (opcional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Informação adicional para o gestor..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Documento comprovativo (opcional)</label>
                <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/20">
                  <Upload size={16} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">{fileName || "Clique para anexar ficheiro"}</span>
                  <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                </label>
              </div>
              <button disabled={!reason || (reason === "Outro" && !otherReason)} onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors">
                Rever e Submeter
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Confirme antes de submeter</h3>
              <Card className="p-4 space-y-3">
                {[
                  { label: "Período", value: `${absence.start} → ${absence.end} (${absence.days} dias)` },
                  { label: "Motivo", value: reason === "Outro" ? otherReason : reason },
                  { label: "Observação", value: note || "—" },
                  { label: "Documento", value: fileName || "Sem anexo" },
                ].map((f) => (
                  <div key={f.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{f.label}</span>
                    <span className="text-xs font-medium text-foreground text-right">{f.value}</span>
                  </div>
                ))}
              </Card>
              <div className="p-3 rounded-lg bg-[#D97706]/10 border border-[#D97706]/20 flex items-start gap-2.5">
                <AlertTriangle size={14} className="text-[#D97706] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#D97706]">Após submeter, a justificação seguirá para confirmação do gestor. Não poderá ser alterada.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Voltar
                </button>
                <button onClick={() => setSubmitted(true)}
                  className="flex-1 py-3 rounded-xl bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors">
                  Submeter Justificação
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Justificações</h3>
            <div className="space-y-2">
              {PREV_ABSENCES.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-xl">
                  {a.status === "approved" ? (
                    <CheckCircle size={15} className="text-[#0E7C59] flex-shrink-0" />
                  ) : a.status === "rejected" ? (
                    <XCircle size={15} className="text-[#C8291A] flex-shrink-0" />
                  ) : (
                    <HelpCircle size={15} className="text-[#D97706] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground font-mono">{a.dates}</p>
                    <p className="text-[11px] text-muted-foreground">{a.reason}</p>
                  </div>
                  <Badge variant={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warning"}>
                    {a.status === "approved" ? "Confirmada" : a.status === "rejected" ? "Recusada" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RegistarFaltaModal({ onClose, onSave }: { onClose: () => void; onSave: (a: Omit<MyAbsence, "id" | "docs" | "adminNote">) => void }) {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);

  const days = startDate && endDate ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1) : 0;

  function submit() {
    onSave({ start: startDate, end: endDate, days, reason: reason === "Outro" ? otherReason : reason, status: "pending", note });
    setDone(true);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-foreground">Justificar Falta</h3>
              {!done && <p className="text-xs text-muted-foreground mt-0.5">Passo {step} de 3</p>}
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
          </div>

          {/* Step dots */}
          {!done && (
            <div className="px-5 pt-4 flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${s < step ? "bg-[#0E7C59] text-white" : s === step ? "bg-accent text-white" : "bg-muted text-muted-foreground"}`}>
                    {s < step ? <Check size={11} /> : s}
                  </div>
                  {s < 3 && <div className={`h-0.5 w-6 rounded ${s < step ? "bg-[#0E7C59]" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {done ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#0E7C59]/10 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-[#0E7C59]" />
                </div>
                <p className="font-semibold text-foreground">Falta Registada</p>
                <p className="text-sm text-muted-foreground">O seu pedido foi registado e aguarda análise do gestor.</p>
                <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">Fechar</button>
              </div>
            ) : step === 1 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Período de ausência</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Data de Início *</label>
                    <DatePicker value={startDate} onChange={setStartDate} className="w-full" />
                    <TimePicker value={startTime} onChange={setStartTime} className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Data de Fim *</label>
                    <DatePicker value={endDate} onChange={setEndDate} className="w-full" />
                    <TimePicker value={endTime} onChange={setEndTime} className="w-full" />
                  </div>
                </div>
                {days > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
                    <Calendar size={13} className="text-accent" />
                    <span className="text-xs text-accent font-medium">{days} dia(s) de ausência</span>
                  </div>
                )}
                <button disabled={!startDate || !endDate} onClick={() => setStep(2)} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors">Continuar</button>
              </div>
            ) : step === 2 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Motivo e documentos</h4>
                <div className="space-y-1.5">
                  {["Doença", "Consulta Médica", "Baixa Médica", "Licença de Casamento", "Falecimento Familiar", "Assuntos Pessoais", "Outro"].map((m) => (
                    <button key={m} onClick={() => setReason(m)} className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${reason === m ? "border-accent bg-accent/5 text-accent font-medium" : "border-border hover:border-accent/30 text-foreground"}`}>{m}</button>
                  ))}
                </div>
                {reason === "Outro" && (
                  <input value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Especifique o motivo..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring" />
                )}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Nota (opcional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Informação adicional..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                </div>
                <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/10">
                  <Upload size={15} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1">{fileName || "Anexar documento (opcional)"}</span>
                  <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Voltar</button>
                  <button disabled={!reason} onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors">Continuar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Confirmar registo</h4>
                <Card className="p-4 space-y-3">
                  {[
                    { label: "Período",   value: `${startDate} ${startTime} → ${endDate} ${endTime}` },
                    { label: "Duração",   value: `${days} dia(s)` },
                    { label: "Motivo",    value: reason === "Outro" ? otherReason : reason },
                    { label: "Documento", value: fileName || "Sem anexo" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="text-xs font-medium text-foreground font-mono text-right">{f.value}</span>
                    </div>
                  ))}
                </Card>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Voltar</button>
                  <button onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#0E7C59] text-white text-sm font-medium hover:bg-[#0A6349] transition-colors">Justificar Falta</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Staff: As Minhas Faltas ──────────────────────────────────────────────────

type MyAbsence = {
  id: number;
  start: string;
  end: string;
  days: number;
  reason: string;
  status: "justified" | "unjustified" | "pending";
  note: string;
  docs: string[];
  adminNote: string;
};

const INITIAL_MY_ABSENCES: MyAbsence[] = [
  { id: 1, start: "20 Jan 2026", end: "22 Jan 2026", days: 3, reason: "Baixa Médica",   status: "justified",   note: "Estive com gripe.",              docs: ["certificado_medico.pdf"], adminNote: "Justificada — certificado recebido." },
  { id: 2, start: "14 Jan 2026", end: "14 Jan 2026", days: 1, reason: "Consulta",        status: "unjustified", note: "",                              docs: [],                         adminNote: "" },
  { id: 3, start: "05 Jan 2026", end: "05 Jan 2026", days: 1, reason: "Pessoal",         status: "justified",   note: "Assunto urgente.",              docs: [],                         adminNote: "Justificada sem documento." },
  { id: 4, start: "18 Nov 2025", end: "20 Nov 2025", days: 3, reason: "Doença",          status: "justified",   note: "",                              docs: ["baixa_nov.pdf"],          adminNote: "Justificada — baixa médica." },
  { id: 5, start: "03 Out 2025", end: "03 Out 2025", days: 1, reason: "Consulta Médica", status: "pending",     note: "Especialidade cardiologia.",    docs: ["consulta.pdf"],           adminNote: "" },
];

function StaffAbsenceDetail() {
  const [absences, setAbsences] = useState<MyAbsence[]>(INITIAL_MY_ABSENCES);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [justification, setJustification] = useState("");
  const [docName, setDocName] = useState("");

  const detail = absences.find((a) => a.id === detailId);

  function addAbsence(a: Omit<MyAbsence, "id" | "docs" | "adminNote">) {
    setAbsences((prev) => [...prev, { ...a, id: prev.length + 1, docs: [], adminNote: "" }]);
  }

  const statusBadge = (s: string) => {
    if (s === "justified")   return <Badge variant="success">Justificada</Badge>;
    if (s === "unjustified") return <Badge variant="danger">Injustificada</Badge>;
    return <Badge variant="warning">Pendente</Badge>;
  };

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (detail) {
    return (
      <div>
        <button onClick={() => { setDetailId(null); setJustification(""); setDocName(""); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ChevronLeft size={15} />Voltar às faltas
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main detail */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{detail.reason}</h2>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">{detail.start} – {detail.end} · {detail.days} dia(s)</p>
                </div>
                {statusBadge(detail.status)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Período",   value: `${detail.start} – ${detail.end}` },
                  { label: "Duração",   value: `${detail.days} dia(s)` },
                  { label: "Motivo",    value: detail.reason },
                  { label: "Estado",    value: detail.status === "justified" ? "Justificada" : detail.status === "unjustified" ? "Injustificada" : "Pendente" },
                ].map((f) => (
                  <div key={f.label} className="bg-muted/20 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-foreground">{f.value}</p>
                  </div>
                ))}
              </div>
              {detail.note && (
                <div className="mt-3 bg-muted/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Nota</p>
                  <p className="text-sm text-foreground">{detail.note}</p>
                </div>
              )}
            </Card>

            {/* Admin note */}
            {detail.adminNote && (
              <Card className="p-4 border-accent/20 bg-accent/5">
                <div className="flex items-start gap-2.5">
                  <Info size={14} className="text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">Nota do Gestor</p>
                    <p className="text-sm text-muted-foreground">{detail.adminNote}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Submit justification */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Submeter Justificação</h3>
              <p className="text-xs text-muted-foreground">Pode anexar um documento (certificado médico, declaração) e/ou adicionar uma nota explicativa para o gestor.</p>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Adicionar nota ou explicação..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors bg-muted/10">
                <Upload size={15} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">{docName || "Clique para anexar documento"}</span>
                <input type="file" className="hidden" onChange={(e) => setDocName(e.target.files?.[0]?.name || "")} />
              </label>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
                <Save size={14} />Submeter Justificação
              </button>
            </Card>
          </div>

          {/* Sidebar: documents */}
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Documentos Anexados</h4>
              {detail.docs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum documento ainda.</p>
              ) : (
                <div className="space-y-2">
                  {detail.docs.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                      <Paperclip size={12} className="text-accent flex-shrink-0" />
                      <span className="text-xs text-foreground truncate">{d}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-4 bg-[#FEF9EC]/50 border-[#D97706]/20">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-[#D97706] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Ausências injustificadas podem ter impacto na sua avaliação. Submeta os documentos atempadamente.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">As Minhas Faltas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{absences.length} faltas registadas</p>
        </div>
      </div>

      {showModal && <RegistarFaltaModal onClose={() => setShowModal(false)} onSave={(a) => { addAbsence(a); setShowModal(false); }} />}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["Motivo", "Período", "Duração", "Estado", "Docs", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {absences.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Inbox size={24} className="text-muted-foreground/20 mx-auto mb-2" />
                  Sem faltas registadas
                </td>
              </tr>
            )}
            {absences.map((a) => (
              <tr
                key={a.id}
                onClick={() => setDetailId(a.id)}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 font-medium text-foreground group-hover:text-accent transition-colors">{a.reason}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{a.start} – {a.end}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.days}d</td>
                <td className="px-4 py-3">{statusBadge(a.status)}</td>
                <td className="px-4 py-3">
                  {a.docs.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <Paperclip size={11} />{a.docs.length}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Staff Layout ─────────────────────────────────────────────────────────────

const STAFF_NAV: { id: StaffPage; label: string; icon: React.ReactNode }[] = [
  { id: "schedule",        label: "O Meu Horário",   icon: <Calendar size={16} /> },
  { id: "absence-detail",  label: "As Minhas Faltas", icon: <Inbox size={16} /> },
  { id: "account",         label: "A Minha Conta",   icon: <User size={16} /> },
];

const STAFF_PAGE_LABELS: Record<StaffPage, string> = {
  "schedule":         "O Meu Horário",
  "register-absence": "Justificar Falta",
  "absence-detail":   "As Minhas Faltas",
  "account":          "A Minha Conta",
};

function StaffLayout({ onSwitchRole, onLogout, initialPage = "schedule" }: { onSwitchRole: () => void; onLogout: () => void; initialPage?: StaffPage }) {
  const [page, setPage] = useState<StaffPage>(initialPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  function navigate(p: StaffPage) { setPage(p); setMobileMenuOpen(false); }

  return (
    <div className="flex h-screen bg-background overflow-hidden w-full">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-sidebar flex-col">
        {/* Logo */}
        <div className="h-12 px-4 flex items-center gap-2.5 border-b border-sidebar-border flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Layers size={13} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-sidebar-foreground tracking-wide">SGDE</p>
            <p className="text-[9px] text-sidebar-foreground/40 uppercase tracking-widest">Assistente</p>
          </div>
        </div>

        {/* User card */}
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-accent font-mono">FL</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">Ana Costa</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">Assistente · Ativo</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {STAFF_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                page === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <span className={`flex-shrink-0 ${page === item.id ? "text-primary" : "text-muted-foreground"}`}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
          <button
            onClick={onSwitchRole}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <Users size={13} />
            <span>Vista Admin</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#C8291A]/70 hover:text-[#C8291A] hover:bg-[#C8291A]/10 transition-colors"
          >
            <LogOut size={13} />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-sidebar flex flex-col lg:hidden" style={{ animation: "slideInLeft 0.22s ease" }}>
            <div className="h-12 px-4 flex items-center justify-between border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
                  <Layers size={11} className="text-white" />
                </div>
                <span className="text-sm font-bold text-sidebar-foreground">SGDE Staff</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/60">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 py-3 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-accent font-mono">FL</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">Ana Costa</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">Assistente · Ativo</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {STAFF_NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    page === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
              <button onClick={onSwitchRole} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                <Users size={13} /><span>Vista Admin</span>
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#C8291A]/70 hover:text-[#C8291A] hover:bg-[#C8291A]/10 transition-colors">
                <LogOut size={13} /><span>Terminar Sessão</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="h-12 bg-card border-b border-border px-4 flex items-center justify-between flex-shrink-0 gap-3">
          {/* Hamburger (mobile) */}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
            <Menu size={18} />
          </button>
          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-muted-foreground">SGDE Staff</span>
            <ChevronRight size={13} className="text-muted-foreground/50 flex-shrink-0" />
            <span className="font-medium text-foreground truncate">{STAFF_PAGE_LABELS[page]}</span>
          </div>
          {/* Mobile title */}
          <span className="lg:hidden text-sm font-semibold text-foreground flex-1 text-center">{STAFF_PAGE_LABELS[page]}</span>
          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <HeaderIcon onClick={() => setDark(!dark)} title={dark ? "Modo claro" : "Modo escuro"}>
              {dark ? <Sun size={17} /> : <Moon size={16} />}
            </HeaderIcon>
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground ml-1">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary-foreground font-mono">FL</span>
              </div>
              <span>Fábio Lopes</span>
            </div>
            <button
              onClick={onSwitchRole}
              className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Users size={12} />Vista Admin
            </button>
            <button
              onClick={onLogout}
              className="hidden lg:flex items-center gap-1.5 text-xs text-[#C8291A]/70 hover:text-[#C8291A] px-2 py-1 rounded hover:bg-[#C8291A]/8 transition-colors"
            >
              <LogOut size={12} />Sair
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {page === "schedule"        && <StaffScheduleSection />}
          {page === "register-absence" && <RegisterAbsence />}
          {page === "absence-detail"  && <StaffAbsenceDetail />}
          {page === "account"         && <AccountProfilePage role="staff" />}
        </div>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center">
        {STAFF_NAV.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${page === item.id ? "text-accent" : "text-muted-foreground"}`}
          >
            {item.icon}
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            {page === item.id && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground"
        >
          <Menu size={16} />
          <span className="text-[9px] font-medium">Menu</span>
        </button>
      </nav>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const DEMO_ACCOUNTS = [
    { email: "admin@sgde.pt",     password: "admin123",  role: "admin" as Role,  name: "Miguel Silva",  label: "Gestor" },
    { email: "assistente@sgde.pt",password: "staff123",  role: "staff" as Role,  name: "Fábio Lopes",   label: "Assistente" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password);
      if (account) {
        onLogin(account.role);
      } else {
        setError("Email ou password incorretos.");
        setLoading(false);
      }
    }, 600);
  }

  function quickLogin(role: Role) {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    setLoading(true);
    setTimeout(() => onLogin(role), 400);
  }

  /* Pinx-style decorative pattern for the right panel */
  const PinxPattern = () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base solid background is the parent's bg-primary */}
      <div className="absolute inset-0 grid gap-4 p-8"
        style={{ gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(8, 1fr)" }}>
        {Array.from({ length: 56 }).map((_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const isFilled = (col + row) % 3 !== 0;
          return (
            <div
              key={i}
              className="rounded-2xl"
              style={{
                backgroundColor: isFilled
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>
    </div>
  );

  const inputCls = (hasError = false) =>
    `w-full px-3.5 py-2.5 text-sm rounded-xl border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/40 ${
      hasError ? "border-destructive" : "border-border"
    }`;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: form ── */}
      <div className="flex-1 lg:max-w-[480px] bg-card flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-[340px]">

          {/* Logo mark */}
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
              <Layers size={20} className="text-white" />
            </div>

            {view === "login" && (
              <>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">Bem-vindo de volta</h1>
                <p className="text-sm text-muted-foreground">Hoje é um novo dia. Inicie sessão para gerir as escalas.</p>
              </>
            )}
            {view === "forgot" && (
              <>
                <button onClick={() => { setView("login"); setError(""); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5">
                  <ChevronLeft size={13} />Voltar ao login
                </button>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">Recuperar password</h1>
                <p className="text-sm text-muted-foreground">Introduza o seu email e enviaremos um link para redefinir a sua password.</p>
              </>
            )}
            {view === "forgot-sent" && (
              <>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle size={22} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">Email enviado</h1>
                <p className="text-sm text-muted-foreground">Enviámos um link de recuperação para <strong className="text-foreground">{resetEmail}</strong>.</p>
              </>
            )}
          </div>

          {/* ── LOGIN form ── */}
          {view === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin@sgde.pt"
                    autoComplete="email"
                    className={inputCls(!!error)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Password <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setView("forgot"); setResetEmail(email); setError(""); }}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Esqueceu a password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={inputCls(!!error) + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye size={15} className={showPassword ? "opacity-100" : "opacity-40"} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-border accent-primary" />
                    <span className="text-sm text-muted-foreground">Lembrar</span>
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="flex-shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || loading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <><RefreshCw size={14} className="animate-spin" />A entrar...</> : "Entrar"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">Ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => { setLoading(true); setTimeout(() => onLogin("admin"), 700); }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground"
                >
                  <svg width="17" height="17" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </button>
                <button
                  type="button"
                  onClick={() => { setLoading(true); setTimeout(() => onLogin("admin"), 700); }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground"
                >
                  <svg width="17" height="17" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Entrar com Microsoft
                </button>
              </div>

              {/* Demo quick access */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mb-3 font-semibold">Acesso rápido · Demo</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => quickLogin("admin")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Settings size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Gestor Admin</span>
                    <span className="text-[10px] text-muted-foreground font-mono">admin@sgde.pt</span>
                  </button>
                  <button
                    onClick={() => quickLogin("staff")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Assistente</span>
                    <span className="text-[10px] text-muted-foreground font-mono">assistente@sgde.pt</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD form ── */}
          {view === "forgot" && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoading(true);
                  setTimeout(() => { setLoading(false); setView("forgot-sent"); }, 800);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email institucional <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@sgde.pt"
                    autoComplete="email"
                    className={inputCls()}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!resetEmail || loading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <><RefreshCw size={14} className="animate-spin" />A enviar...</> : "Enviar link de recuperação"}
                </button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-5">
                Não recebeu o email? Verifique a pasta de spam ou contacte o administrador.
              </p>
            </>
          )}

          {/* ── FORGOT SENT ── */}
          {view === "forgot-sent" && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs font-mono text-muted-foreground text-center">
                {resetEmail}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O link é válido durante <strong className="text-foreground">30 minutos</strong>. Verifique também a pasta de spam.
              </p>
              <button
                onClick={() => { setView("login"); setResetEmail(""); }}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Right panel: decorative Pinx pattern ── */}
      <div className="hidden lg:block flex-1 bg-primary relative overflow-hidden">
        <PinxPattern />
        {/* Centered branding overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-12">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
            <Layers size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Sistema de Gestão<br />Dinâmica de Escalas
          </h2>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">
            Controlo de cobertura, gestão de ausências e conformidade em tempo real para equipas de assistentes.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
            {[
              { icon: <Calendar size={14} />, text: "Escalas automáticas" },
              { icon: <Shield size={14} />, text: "Cobertura mínima" },
              { icon: <Users size={14} />, text: "Gestão de equipa" },
              { icon: <BarChart2 size={14} />, text: "Relatórios" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5 border border-white/10">
                <span className="text-white/70">{f.icon}</span>
                <span className="text-white/90 text-xs font-medium">{f.text}</span>
              </div>
            ))}
          </div>
          <p className="absolute bottom-6 text-white/30 text-xs">© 2026 SGDE · v2.0</p>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export type LegacyAppProps = {
  role?: Role;
  adminPage?: AdminPage;
  staffPage?: StaffPage;
};

export default function App({ role: requestedRole, adminPage = "dashboard", staffPage = "schedule" }: LegacyAppProps = {}) {
  const [role, setRole] = useState<Role | null>(requestedRole ?? null);

  if (!role) {
    return (
      <div style={{ fontFamily: "var(--font-body)" }}>
        <LoginPage onLogin={(r) => setRole(r)} />
      </div>
    );
  }

  return (
    <div className="h-screen w-full" style={{ fontFamily: "var(--font-body)" }}>
      {role === "admin" ? (
        <AdminLayout initialPage={adminPage} onSwitchRole={() => setRole("staff")} onLogout={() => setRole(null)} />
      ) : (
        <StaffLayout initialPage={staffPage} onSwitchRole={() => setRole("admin")} onLogout={() => setRole(null)} />
      )}
    </div>
  );
}
