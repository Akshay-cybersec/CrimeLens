'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { CaseOverview, EvidenceResponse, InsightResponse, SimilarCaseResponse, TimelineResponse } from '@/types/api';

type Props = {
  caseId: string;
  overview: CaseOverview | null;
  timeline: TimelineResponse | null;
  insights: InsightResponse[];
  evidence: EvidenceResponse | null;
  similarCases: SimilarCaseResponse[];
  onRegenerateResponse?: () => Promise<void>;
};

const parseRawFields = (rawText: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  rawText
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf(':');
      if (index > 0) {
        const key = part.slice(0, index).trim().toLowerCase();
        const value = part.slice(index + 1).trim();
        if (key && value) fields[key] = value;
      }
    });
  return fields;
};

const normalizeEntity = (value: string): string => value.replace(/\s+/g, ' ').trim();

const pickEntity = (fields: Record<string, string>, preferred: string[]): string | null => {
  for (const key of preferred) {
    const value = fields[key];
    if (value && value.trim()) return normalizeEntity(value);
  }
  return null;
};

type ProfileBag = {
  victim?: string;
  secondaryVictim?: string;
  suspect?: string;
  suspectRelation?: string;
  complainant?: string;
};

export default function CaseDecisionBetaView({ caseId, overview, timeline, insights, evidence, similarCases, onRegenerateResponse }: Props) {
  const [regenerating, setRegenerating] = React.useState(false);
  const [statusNote, setStatusNote] = React.useState('');
  const topInsight = insights[0];
  const topCluster = evidence?.clusters?.[0];
  const topMatch = similarCases[0];

  const totalEvents = overview?.total_events ?? timeline?.pagination.total ?? timeline?.timeline.length ?? 0;
  const suspiciousCount = timeline?.suspicious_windows?.length ?? 0;
  const clusterCount = evidence?.clusters?.length ?? 0;
  const insightConfidence = Math.round((topInsight?.confidence_score ?? 0) * 100);
  const topRisk = Math.round((topCluster?.risk_score ?? 0) * 100);

  const insightScore = topInsight?.confidence_score ?? 0;
  const clusterScore = topCluster?.risk_score ?? 0;
  const weighted = Math.min(1, insightScore * 0.45 + clusterScore * 0.4 + Math.min(0.15, suspiciousCount * 0.03));
  const decision = {
    score: Math.round(weighted * 100),
    verdict: weighted >= 0.72 ? 'Escalate for immediate review' : weighted >= 0.5 ? 'Needs investigator validation' : 'Monitor and gather more evidence',
  };

  const hypothesisStory = (() => {
    const events = timeline?.timeline ?? [];
    if (!events.length) {
      return 'UFDR timeline data is still limited, so this is an early-stage hypothesis: the case currently shows low interaction visibility and requires additional extraction sources (messages/calls/social app logs) to build a stronger actor-to-actor story.';
    }

    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const interactions: Array<{ from: string; to: string; when: string }> = [];
    const profiles: ProfileBag = {};
    const loweredRows = sorted.map((item) => (item.raw_text || '').toLowerCase());
    const hasAny = (...tokens: string[]) => loweredRows.some((line) => tokens.some((token) => line.includes(token)));

    for (const event of sorted) {
      const fields = parseRawFields(event.raw_text || '');
      const role = (fields.role || '').toLowerCase();
      const profileName = pickEntity(fields, ['name', 'contact_name', 'person', 'owner_name']);
      if (profileName) {
        if (role === 'victim' && !profiles.victim) profiles.victim = profileName;
        if (role === 'secondary_victim' && !profiles.secondaryVictim) profiles.secondaryVictim = profileName;
        if (role === 'suspect' && !profiles.suspect) {
          profiles.suspect = profileName;
          if (fields.relation) profiles.suspectRelation = fields.relation;
        }
        if (role === 'complainant' && !profiles.complainant) profiles.complainant = profileName;
      }

      const from = pickEntity(fields, ['from', 'sender', 'source', 'owner', 'caller', 'contact_from']);
      const to = pickEntity(fields, ['to', 'receiver', 'target', 'callee', 'contact_to', 'contact']);
      if (from && to && from !== to) {
        interactions.push({
          from,
          to,
          when: new Date(event.timestamp).toLocaleString(),
        });
      }
    }

    const victimName = profiles.victim || 'the primary victim';
    const suspectName = profiles.suspect || 'the primary suspect';
    const secondaryName = profiles.secondaryVictim || 'the secondary victim';
    const suspectLabel = profiles.suspectRelation
      ? `${suspectName}, ${profiles.suspectRelation.toLowerCase()}`
      : suspectName;

    const hasDriveAccess = hasAny('google drive', 'cloud_download', 'drive export', 'personal folder');
    const hasAnonAccount = hasAny('anonymous gmail', 'account_creation', 'anonymous account');
    const hasTor = hasAny('tor_browser_install', 'tor browser install', 'tor browser');
    const hasThreat = hasAny('threat', 'blackmail', 'extortion');
    const hasTelegram = hasAny('telegram');
    const hasCrypto = hasAny('crypto_wallet_creation', 'ethereum', 'wallet');
    const hasSimSwap = hasAny('sim_swap', 'sim swap');
    const hasResetSignal = hasAny('account reset', 'password reset', 'reset account', 'recovery changed');
    const hasSearchDistress = hasAny('how to deal with blackmail humiliation', 'blackmail humiliation', 'search_query');
    const hasGoodbye = hasAny('goodbye_message', 'goodbye message', 'i’m sorry', "i'm sorry", 'i can’t fix this', "i can't fix this");
    const hasSelfHarmSignal = hasAny('self-harm', 'self harm', 'deceased');
    const hasCleanup = hasAny('bulk_chat_deletion', 'chat deletion', 'deleted', 'removed', 'wiped');

    const narrativeLines: string[] = [];
    if (hasDriveAccess) {
      narrativeLines.push(`${suspectLabel} appears to have gained access to private cloud content linked to ${secondaryName}.`);
    }
    if (hasAnonAccount || hasTor) {
      const parts: string[] = [];
      if (hasAnonAccount) parts.push('created an anonymous account');
      if (hasTor) parts.push('used TOR to reduce traceability');
      narrativeLines.push(`${suspectName} then likely ${parts.join(' and ')}.`);
    }
    if (hasThreat || hasTelegram || hasCrypto) {
      const channel = hasTelegram ? 'via Telegram' : 'through direct digital messaging';
      const demand = hasCrypto ? 'with cryptocurrency-linked coercion signals' : 'with coercive pressure signals';
      narrativeLines.push(`${victimName} appears to have been contacted ${channel}, ${demand}, with threats around private data exposure.`);
    }
    if (hasSimSwap || hasResetSignal) {
      const controlOps: string[] = [];
      if (hasSimSwap) controlOps.push('possible SIM-swap behavior');
      if (hasResetSignal) controlOps.push('account-control reset indicators');
      narrativeLines.push(`Control escalation indicators were detected: ${controlOps.join(' and ')}.`);
    }
    if (hasSearchDistress) {
      narrativeLines.push(`${victimName} searched for help related to blackmail pressure, indicating escalating emotional distress.`);
    }
    if (hasGoodbye || hasSelfHarmSignal) {
      narrativeLines.push(`A goodbye/self-harm signal appears in the timeline, suggesting severe crisis before case closure events.`);
    }
    if (hasCleanup) {
      narrativeLines.push(`Post-incident deletion/cleanup behavior is present, consistent with potential evidence suppression attempts.`);
    }

    if (narrativeLines.length >= 4) {
      return narrativeLines.join(' ');
    }

    if (interactions.length < 2) {
      const earliest = sorted[0];
      const latest = sorted[sorted.length - 1];
      const clusterRisk = topCluster ? `${Math.round(topCluster.risk_score * 100)}%` : 'N/A';
      const insightRisk = topInsight ? `${Math.round(topInsight.confidence_score * 100)}%` : 'N/A';
      return `A complete X->Y->Z chain is not fully visible yet, but the extracted activity from ${new Date(earliest.timestamp).toLocaleString()} to ${new Date(latest.timestamp).toLocaleString()} still indicates behavioral irregularities. `
        + `${suspectName} appears linked to pressure signals affecting ${victimName}, with potential spillover exposure involving ${secondaryName}. `
        + `Current indicators (cluster risk ${clusterRisk}, insight confidence ${insightRisk}) suggest possible coordinated or concealed communication patterns. `
        + `Working hypothesis: a small interaction set may be part of a larger hidden exchange, so this case should stay in active review while more communication artifacts are ingested.`;
    }

    const uniquePeople: string[] = [];
    const pushUnique = (name: string) => {
      if (!uniquePeople.some((item) => item.toLowerCase() === name.toLowerCase())) uniquePeople.push(name);
    };
    interactions.forEach((item) => {
      pushUnique(item.from);
      pushUnique(item.to);
    });

    const aliases = new Map<string, string>();
    const roleMapped = new Map<string, string>();
    if (profiles.victim) roleMapped.set(profiles.victim.toLowerCase(), profiles.victim);
    if (profiles.secondaryVictim) roleMapped.set(profiles.secondaryVictim.toLowerCase(), profiles.secondaryVictim);
    if (profiles.suspect) roleMapped.set(profiles.suspect.toLowerCase(), profiles.suspect);
    if (profiles.complainant) roleMapped.set(profiles.complainant.toLowerCase(), profiles.complainant);
    uniquePeople.forEach((name, index) => {
      const mapped = roleMapped.get(name.toLowerCase());
      aliases.set(name.toLowerCase(), mapped || `User ${String.fromCharCode(88 + (index % 3))}${index >= 3 ? index - 2 : ''}`);
    });
    const aliasOf = (name: string) => aliases.get(name.toLowerCase()) || name;

    const first = interactions[0];
    const second = interactions.find((item) => item.from.toLowerCase() === first.to.toLowerCase() && item.to.toLowerCase() !== first.from.toLowerCase()) || interactions[1];
    const clusterRisk = topCluster ? `${Math.round(topCluster.risk_score * 100)}%` : 'N/A';
    const insightRisk = topInsight ? `${Math.round(topInsight.confidence_score * 100)}%` : 'N/A';

    return `${aliasOf(first.from)} appears to have communicated with ${aliasOf(first.to)} around ${first.when}. `
      + `After that, ${aliasOf(second.from)} interacted with ${aliasOf(second.to)} around ${second.when}. `
      + `This sequence may indicate possible transfer of sensitive context from ${aliasOf(first.from)} through ${aliasOf(first.to)} toward ${aliasOf(second.to)}. `
      + `One plausible hypothesis is that gathered personal details were later used for pressure or blackmail attempts. `
      + `Current system signals (cluster risk ${clusterRisk}, insight confidence ${insightRisk}) support escalation for human verification before final conclusion.`;
  })();

  const storyPoints = [
    `Case ${caseId || 'N/A'} was reconstructed from ${totalEvents} UFDR-derived events.`,
    suspiciousCount
      ? `${suspiciousCount} suspicious timeline windows were detected, indicating behavior breaks around critical periods.`
      : 'No major suspicious timeline windows were detected, so chronology remains relatively stable.',
    clusterCount
      ? `${clusterCount} anomaly clusters were flagged, with the top cluster at ${topRisk}% risk.`
      : 'No high-confidence anomaly clusters were flagged yet.',
    topInsight
      ? `The AI insight reports ${insightConfidence}% confidence and indicates behavioral inconsistency patterns that need investigator validation.`
      : 'No AI insight summary is available yet for this case.',
    topMatch
      ? `A similar historical case (${topMatch.case_id}) matched at ${(topMatch.similarity_score * 100).toFixed(1)}%, suggesting a comparable digital behavior profile.`
      : 'No strong similar-case match was found.',
    `Current decision: ${decision.verdict} (decision strength ${decision.score}%).`,
  ];

  const hypothesisPoints = hypothesisStory
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const nextStepPlan = (() => {
    const events = timeline?.timeline ?? [];
    const rows = events.map((event) => ({
      fields: parseRawFields(event.raw_text || ''),
      raw: (event.raw_text || '').toLowerCase(),
    }));
    const hasAny = (...tokens: string[]) => rows.some((row) => tokens.some((token) => row.raw.includes(token)));

    const profile: ProfileBag = {};
    rows.forEach((row) => {
      const role = (row.fields.role || '').toLowerCase();
      const name = pickEntity(row.fields, ['name', 'contact_name', 'person', 'owner_name']);
      if (!name) return;
      if (role === 'victim' && !profile.victim) profile.victim = name;
      if (role === 'secondary_victim' && !profile.secondaryVictim) profile.secondaryVictim = name;
      if (role === 'suspect' && !profile.suspect) profile.suspect = name;
    });

    const victim = profile.victim || 'the victim';
    const suspect = profile.suspect || 'the suspect';
    const secondary = profile.secondaryVictim || 'the secondary victim';

    const steps: string[] = [];
    if (hasAny('telegram', 'threat', 'blackmail', 'extortion')) {
      steps.push(`Extract and preserve full Telegram/message threads between ${suspect} and ${victim}, including deleted/recovered rows.`);
    }
    if (hasAny('sim_swap', 'sim swap')) {
      steps.push(`Issue telecom CDR/SIM replacement request for ${victim} and related numbers to verify SIM-swap timeline.`);
    }
    if (hasAny('crypto_wallet_creation', 'ethereum', 'wallet')) {
      steps.push('Trace wallet creation and transaction graph, then correlate with message timestamps and demand windows.');
    }
    if (hasAny('google drive', 'cloud_download', 'drive export')) {
      steps.push(`Serve cloud-provider legal request for access logs and download history tied to ${secondary}'s compromised data.`);
    }
    if (hasAny('bulk_chat_deletion', 'chat deletion', 'deleted', 'wiped', 'removed')) {
      steps.push('Prioritize forensic recovery of deleted chat artifacts (WAL/journal/cache) and preserve chain-of-custody hashes.');
    }
    if (hasAny('goodbye_message', 'self-harm', 'self harm', 'deceased', 'blackmail humiliation')) {
      steps.push('Attach psychological coercion timeline annex for supervisory/legal review and victim-support context mapping.');
    }

    if (!steps.length) {
      steps.push('Run focused re-extraction for messaging, account-recovery, and cloud-access logs to strengthen actor-chain confidence.');
    }

    const headline =
      decision.verdict === 'Escalate for immediate review'
        ? 'Priority action plan based on current high-risk signals'
        : decision.verdict === 'Needs investigator validation'
          ? 'Validation action plan to confirm the current hypothesis'
          : 'Monitoring action plan to strengthen case confidence';

    return { headline, steps: steps.slice(0, 5) };
  })();

  const legalMapping = (() => {
    const events = timeline?.timeline ?? [];
    const rows = events.map((event) => ({
      fields: parseRawFields(event.raw_text || ''),
      raw: (event.raw_text || '').toLowerCase(),
    }));
    const hasAny = (...tokens: string[]) => rows.some((row) => tokens.some((token) => row.raw.includes(token)));

    const profile: ProfileBag = {};
    rows.forEach((row) => {
      const role = (row.fields.role || '').toLowerCase();
      const name = pickEntity(row.fields, ['name', 'contact_name', 'person', 'owner_name']);
      if (!name) return;
      if (role === 'victim' && !profile.victim) profile.victim = name;
      if (role === 'secondary_victim' && !profile.secondaryVictim) profile.secondaryVictim = name;
      if (role === 'suspect' && !profile.suspect) profile.suspect = name;
    });

    const suspect = profile.suspect || 'Primary Suspect (to be confirmed)';
    const victim = profile.victim || 'Primary Victim';
    const allegations: Array<{ title: string; sections: string; why: string }> = [];

    if (hasAny('threat', 'blackmail', 'extortion', 'telegram')) {
      allegations.push({
        title: 'Criminal Intimidation / Extortion',
        sections: 'IPC 384, 385, 503, 506 (verify current BNS equivalents)',
        why: `Threat/coercion indicators tied to digital communication against ${victim}.`,
      });
    }
    if (hasAny('google drive', 'cloud_download', 'data_compromised', 'private content')) {
      allegations.push({
        title: 'Unauthorized Data Access / Privacy Violation',
        sections: 'IT Act 66C, 66E, 72 (context dependent)',
        why: 'Signals suggest unauthorized access/handling of private digital content.',
      });
    }
    if (hasAny('anonymous gmail', 'tor_browser_install', 'tor browser', 'identity mask')) {
      allegations.push({
        title: 'Identity Masking / Personation-Facilitated Fraud',
        sections: 'IT Act 66D (plus allied cyber-forgery provisions if applicable)',
        why: 'Anonymous account + anonymity tooling may indicate intent to conceal identity.',
      });
    }
    if (hasAny('goodbye_message', 'self-harm', 'self harm', 'deceased', 'psychological coercion')) {
      allegations.push({
        title: 'Abetment / Psychological Coercion Linked Outcome',
        sections: 'IPC 306 (verify threshold and evidentiary standard)',
        why: 'Timeline includes coercion pressure markers and severe victim distress outcomes.',
      });
    }
    if (hasAny('bulk_chat_deletion', 'chat deletion', 'deleted', 'removed', 'wiped')) {
      allegations.push({
        title: 'Destruction / Concealment of Evidence',
        sections: 'IPC 201 and relevant digital evidence tampering provisions',
        why: 'Post-incident deletion/cleanup behavior appears in recovered artifacts.',
      });
    }

    if (!allegations.length) {
      allegations.push({
        title: 'Further Legal Classification Required',
        sections: 'To be mapped by legal cell after deeper artifact review',
        why: 'Current extracted signals are not yet sufficient for confident section mapping.',
      });
    }

    return { suspect, victim, allegations: allegations.slice(0, 6) };
  })();

  const handleRegenerateResponse = async () => {
    if (!caseId || !onRegenerateResponse) return;
    try {
      setRegenerating(true);
      setStatusNote('');
      await onRegenerateResponse();
      setStatusNote(`Case decision regenerated at ${new Date().toLocaleTimeString()}.`);
    } catch {
      setStatusNote('Failed to regenerate case decision. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">Beta Route</p>
        <p className="text-sm text-amber-900 mt-1 leading-relaxed">
          This conclusion is an investigative draft generated from UFDR-derived signals. It is not a legal finding.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Case Decision (Beta)</p>
          <button
            type="button"
            disabled={!caseId || regenerating}
            onClick={() => void handleRegenerateResponse()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {regenerating ? 'Regenerating...' : 'Regenerate Response'}
          </button>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-2">Case {caseId || 'N/A'} Story & Conclusion</h2>
        {statusNote ? <p className="text-[11px] text-slate-600 mt-2">{statusNote}</p> : null}
        <ul className="mt-3 space-y-2.5">
          {storyPoints.map((point, idx) => (
            <li key={`${point}-${idx}`} className="text-sm text-slate-700 leading-7">
              <span className="font-semibold text-slate-900">Point {idx + 1}:</span> {point}
            </li>
          ))}
        </ul>
        <div className="mt-4 inline-flex items-center rounded border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="text-xs text-slate-500 mr-2">Decision Strength</span>
          <span className="text-sm font-bold text-slate-900">{decision.score}%</span>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">AI Predicted Story (Hypothesis)</p>
        <ul className="mt-2 space-y-2">
          {hypothesisPoints.map((point, idx) => (
            <li key={`${point}-${idx}`} className="text-sm text-blue-900 leading-7">
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Recommended Next Step</p>
        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{nextStepPlan.headline}</p>
        <ul className="mt-2 space-y-2">
          {nextStepPlan.steps.map((step, idx) => (
            <li key={`${step}-${idx}`} className="text-sm text-slate-700 leading-7">
              <span className="font-semibold text-slate-900">Step {idx + 1}:</span> {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-xs font-bold tracking-widest text-rose-700 uppercase">Preliminary Legal Mapping (Advisory)</p>
        <p className="text-sm text-rose-900 mt-2 leading-relaxed">
          Possible suspect: <span className="font-semibold">{legalMapping.suspect}</span>
        </p>
        <ul className="mt-2 space-y-2">
          {legalMapping.allegations.map((item, idx) => (
            <li key={`${item.title}-${idx}`} className="text-sm text-rose-900 leading-7">
              <span className="font-semibold">{item.title}:</span> {item.sections}
              <div className="text-xs text-rose-700 mt-0.5">{item.why}</div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-rose-700 mt-3">
          This section is investigative guidance only; final charges/sections must be confirmed by authorized legal counsel.
        </p>
      </div>
    </div>
  );
}

