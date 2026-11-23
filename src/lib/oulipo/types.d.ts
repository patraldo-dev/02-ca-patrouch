// Types for the duel's word engine and server flow.
//
// The modules themselves are plain JavaScript, like the rest of src/lib;
// they carry JSDoc against these declarations so that `svelte-check` can
// hold them to the same bar whatever a file happens to be named.

export type Lang = 'en' | 'es' | 'fr';
export type VerbPolicy = 'strict' | 'families';

/** Which verb policy a text is read under. */
export interface Policy {
    verbs: VerbPolicy;
}

/** One letter run of a text. Offsets index the normalized text. */
export interface Token {
    form: string;
    key: string;
    fn: boolean;
    content: boolean;
    start: number;
    end: number;
    line: number;
}

/** One word family of a text, with the surface forms it took. */
export interface WordType {
    key: string;
    display: string;
    forms: Record<string, number>;
    count: number;
    first: number;
}

export interface Analysis {
    lang: Lang;
    verbs: VerbPolicy;
    types: WordType[];
    vocabSize: number;
    contentTokens: number;
    functionTokens: number;
    shortTokens: number;
    totalTokens: number;
}

/** A marked word: where it sits and which family it belongs to. */
export interface Span {
    key: string;
    form: string;
    start: number;
    end: number;
    line: number;
}

/** One sent word and what it did to the draft. */
export interface Rope {
    key: string;
    forms: string[];
    bite: boolean;
    draftCount: number;
    draftForms: string[];
}

export interface Verdict {
    ropes: Rope[];
    invalid: string[];
    bites: number;
    misses: number;
    score: number;
    muzzlePct: number;
    draftTokens: number;
    draftTypes: number;
    storyTypes: number;
    storyTokens: number;
}

/** The contract every language file fulfils in the same shape. */
export interface LangConfig {
    code: Lang;
    minWordLength: number;
    apostrophe: 'split' | 'english';
    foldChars: Record<string, string> | null;
    functionSet: Set<string>;
    verbs: VerbPolicy;
    verbFamilyMap: Map<string, string>;
    fold: (form: string) => string | null;
    tiers: number[];
}

// ── Server side ────────────────────────────────────────────────────────

export type Row = Record<string, any>;

/** What the duel needs from D1 (and what the test double provides). */
export interface Statement {
    first(): Promise<Row | null>;
    all(): Promise<{ results?: Row[] }>;
    run(): Promise<{ meta?: { changes?: number } | void }>;
}
export interface Db {
    prepare(query: string): { bind(...args: unknown[]): Statement };
}

/** What the duel needs from the Workers AI binding. */
export interface Engine {
    run(
        model: string,
        input: {
            messages: { role: string; content: string }[];
            max_tokens: number;
            temperature: number;
        }
    ): Promise<{ response?: unknown }>;
}

export interface RewriteView {
    status: 'pending' | 'writing' | 'clean' | 'escaped';
    attempts: number;
    violations: string[];
    text: string;
    spans: Span[];
}

/** A locked duel as the player sees it. */
export interface RoundView {
    id: string;
    date: string;
    locale: Lang;
    policy: Policy;
    story: string;
    ropes: Rope[];
    ropeCount: number;
    storyTypes: number;
    bites: number;
    misses: number;
    score: number;
    muzzlePct: number;
    tier: number;
    draft: { text: string; tokens: number; spans: Span[] };
    rewrite: RewriteView;
}

export interface BoardRow {
    id: string;
    mine: boolean;
    name: string | null;
    score: number;
    muzzlePct: number;
    bites: number;
    misses: number;
    ropeCount: number;
}
