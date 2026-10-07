import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const THEME_STORAGE_KEY = "zerokara.theme.v1";

export type TextSize = "normal" | "large" | "larger" | "largest";
export const TEXT_SIZES: TextSize[] = ["normal", "large", "larger", "largest"];

type ThemeState = {
  dark: boolean;
  color: boolean;
  textSize: TextSize;
  notifications: boolean;
  /** Notification cadence, in days. */
  notifyEveryDays: number;
  /** Time of day the reminder fires, as "HH:MM" (24h, local time). */
  notifyTime: string;
  /** Hide the character shape while tracing strokes, to force recall. */
  hideCharacterInTrace: boolean;
  /** Show the per-item "report an error" buttons in lessons and practice. */
  reportButtons: boolean;
  study: StudySettings;
};

/** Spaced-repetition limits and the daily study pattern, set in Settings → Study. */
export type StudySettings = {
  /** Cards seen for the first time, per day and per deck (kana, kanji, vocabulary). */
  newPerDay: number;
  /** Reviews of known cards, per day and per deck. */
  reviewsPerDay: number;
  /** Cards in one review session. */
  sessionSize: number;
  /** Show a card again later in the same session after "Again". */
  requeueAgain: boolean;
  /** Alternate lesson days and review days, or suggest both every day. */
  pattern: "alternate" | "both";
};

export const STUDY_DEFAULTS: StudySettings = {
  newPerDay: 10,
  reviewsPerDay: 100,
  sessionSize: 20,
  requeueAgain: true,
  pattern: "alternate",
};

function readStudy(p: Partial<StudySettings> | undefined): StudySettings {
  const num = (v: unknown, def: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.round(v)) : def;
  return {
    newPerDay: num(p?.newPerDay, STUDY_DEFAULTS.newPerDay, 200),
    reviewsPerDay: num(p?.reviewsPerDay, STUDY_DEFAULTS.reviewsPerDay, 1000),
    sessionSize: Math.max(1, num(p?.sessionSize, STUDY_DEFAULTS.sessionSize, 200)),
    requeueAgain: p?.requeueAgain ?? STUDY_DEFAULTS.requeueAgain,
    pattern: p?.pattern === "both" ? "both" : "alternate",
  };
}

type ThemeContextValue = ThemeState & {
  setDark: (v: boolean) => void;
  setColor: (v: boolean) => void;
  setTextSize: (v: TextSize) => void;
  setNotifications: (v: boolean) => void;
  setNotifyEveryDays: (v: number) => void;
  setNotifyTime: (v: string) => void;
  setHideCharacterInTrace: (v: boolean) => void;
  setReportButtons: (v: boolean) => void;
  setStudy: (v: Partial<StudySettings>) => void;
  hydrated: boolean;
};

const defaults: ThemeState = {
  dark: false,
  color: false,
  textSize: "normal",
  notifications: false,
  notifyEveryDays: 1,
  notifyTime: "19:00",
  hideCharacterInTrace: false,
  reportButtons: false,
  study: STUDY_DEFAULTS,
};

const ThemeContext = createContext<ThemeContextValue>({
  ...defaults,
  setDark: () => {},
  setColor: () => {},
  setTextSize: () => {},
  setNotifications: () => {},
  setNotifyEveryDays: () => {},
  setNotifyTime: () => {},
  setHideCharacterInTrace: () => {},
  setReportButtons: () => {},
  setStudy: () => {},
  hydrated: false,
});

function read(): ThemeState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ThemeState>;
      return {
        dark: !!p.dark,
        color: !!p.color,
        textSize: TEXT_SIZES.includes(p.textSize as TextSize) ? (p.textSize as TextSize) : "normal",
        notifications: !!p.notifications,
        notifyEveryDays:
          typeof p.notifyEveryDays === "number" && p.notifyEveryDays > 0 ? p.notifyEveryDays : 1,
        notifyTime:
          typeof p.notifyTime === "string" && /^\d{2}:\d{2}$/.test(p.notifyTime)
            ? p.notifyTime
            : "19:00",
        hideCharacterInTrace: !!p.hideCharacterInTrace,
        reportButtons: !!p.reportButtons,
        study: readStudy(p.study),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    ...defaults,
    dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  };
}

/** Script injected in <head> so the theme is applied before first paint. */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var p=s?JSON.parse(s):null;var d=p?!!p.dark:window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');if(p&&['large','larger','largest'].indexOf(p.textSize)>=0)document.documentElement.classList.add('text-'+p.textSize);}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", state.dark);
    for (const size of TEXT_SIZES) {
      if (size !== "normal")
        document.documentElement.classList.toggle(`text-${size}`, state.textSize === size);
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const setDark = useCallback((v: boolean) => setState((s) => ({ ...s, dark: v })), []);
  const setColor = useCallback((v: boolean) => setState((s) => ({ ...s, color: v })), []);
  const setTextSize = useCallback((v: TextSize) => setState((s) => ({ ...s, textSize: v })), []);
  const setNotifications = useCallback(
    (v: boolean) => setState((s) => ({ ...s, notifications: v })),
    [],
  );
  const setNotifyEveryDays = useCallback(
    (v: number) => setState((s) => ({ ...s, notifyEveryDays: Math.max(1, Math.round(v)) })),
    [],
  );
  const setNotifyTime = useCallback(
    (v: string) =>
      setState((s) => ({
        ...s,
        notifyTime: /^\d{2}:\d{2}$/.test(v) ? v : s.notifyTime,
      })),
    [],
  );
  const setHideCharacterInTrace = useCallback(
    (v: boolean) => setState((s) => ({ ...s, hideCharacterInTrace: v })),
    [],
  );

  const setReportButtons = useCallback(
    (v: boolean) => setState((s) => ({ ...s, reportButtons: v })),
    [],
  );

  const setStudy = useCallback(
    (v: Partial<StudySettings>) =>
      setState((s) => ({ ...s, study: readStudy({ ...s.study, ...v }) })),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      setStudy,
      setDark,
      setColor,
      setTextSize,
      setNotifications,
      setNotifyEveryDays,
      setNotifyTime,
      setHideCharacterInTrace,
      setReportButtons,
      hydrated,
    }),
    [
      state,
      setDark,
      setColor,
      setTextSize,
      setNotifications,
      setNotifyEveryDays,
      setNotifyTime,
      setHideCharacterInTrace,
      setReportButtons,
      setStudy,
      hydrated,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
