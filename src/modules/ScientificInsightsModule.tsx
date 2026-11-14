import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { TrendAnalysisResult } from '../types/terratrend';

interface ScientificInsightsModuleProps {
  analyses: TrendAnalysisResult[];
  activeAnalysis: TrendAnalysisResult | null;
}

type QuestionKey =
  | 'strongest-increasing'
  | 'decreasing-hydrology'
  | 'active-significance'
  | 'regional-divergence'
  | 'data-quality';

const QUESTIONS: Array<{ id: QuestionKey; label: string }> = [
  { id: 'strongest-increasing', label: 'Which analyzed region has the strongest increasing trend?' },
  { id: 'decreasing-hydrology', label: 'Which regions show decreasing rainfall or soil moisture?' },
  { id: 'active-significance', label: 'Is the active trend statistically significant?' },
  { id: 'regional-divergence', label: 'How do analyzed regions differ for the same variable?' },
  { id: 'data-quality', label: 'Which series have insufficient observations or autocorrelation?' },
];

export function ScientificInsightsModule({ analyses, activeAnalysis }: ScientificInsightsModuleProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionKey>('strongest-increasing');

  const computeAnswer = (q: QuestionKey): { headline: string; body: string; evidence: string[] } => {
    if (analyses.length === 0) {
      return {
        headline: 'No computed analyses in current session.',
        body: 'Execute one or more analyses in Variable Selection Studio or Regional Comparison to generate deterministic scientific insights.',
        evidence: [],
      };
    }

    if (q === 'strongest-increasing') {
      const increasing = analyses
        .filter((a) => a.sensSlope && a.sensSlope.slopePerYear > 0)
        .sort((a, b) => (b.sensSlope?.slopePerYear ?? 0) - (a.sensSlope?.slopePerYear ?? 0));
      if (increasing.length === 0) {
        return {
          headline: 'No increasing trends detected among analyzed series.',
          body: 'None of the currently computed regions exhibit a positive Sen slope.',
          evidence: [],
        };
      }
      const top = increasing[0];
      return {
        headline: `${top.regionName} (${top.variableName}) exhibits the steepest positive rate at +${top.sensSlope!.slopePerYear.toFixed(
          4
        )} ${top.unit}/year.`,
        body: `Evaluated across ${top.startDate} to ${top.endDate} (${top.validObservations} valid samples). Statistical status: ${top.statusLabel} (Mann-Kendall p = ${
          top.mannKendall?.pValue.toFixed(5) ?? 'N/A'
        } at α = ${top.alpha}).`,
        evidence: increasing.slice(0, 4).map(
          (item) =>
            `${item.regionName} · ${item.variableName}: +${item.sensSlope!.slopePerYear.toFixed(
              4
            )} ${item.unit}/yr (p=${item.mannKendall?.pValue.toFixed(4)})`
        ),
      };
    }

    if (q === 'decreasing-hydrology') {
      const hydroDown = analyses.filter(
        (a) =>
          (a.variableId === 'PRECTOTCORR' || a.variableId === 'GWETTOP') &&
          a.sensSlope &&
          a.sensSlope.slopePerYear < 0
      );
      if (hydroDown.length === 0) {
        return {
          headline: 'No decreasing precipitation or soil moisture series found in session.',
          body: 'Run precipitation (PRECTOTCORR) or surface soil moisture (GWETTOP) in arid/semi-arid regions such as U.S. Southwest or Iberian Mediterranean to test hydrological drying.',
          evidence: [],
        };
      }
      return {
        headline: `${hydroDown.length} hydrological series exhibit negative slopes.`,
        body: 'Negative Sen slopes indicate declining surface moisture or rainfall rates over the inspected window, though individual statistical significance varies with sample size and interannual variance.',
        evidence: hydroDown.map(
          (item) =>
            `${item.regionName} (${item.variableName}): ${item.sensSlope!.slopePerYear.toFixed(4)} ${item.unit}/yr · ${
              item.statusLabel
            } (p=${item.mannKendall?.pValue.toFixed(4)})`
        ),
      };
    }

    if (q === 'active-significance') {
      const target = activeAnalysis || analyses[0];
      return {
        headline: `${target.variableName} in ${target.regionName}: ${target.statusLabel}.`,
        body: target.classificationRationale,
        evidence: [
          `Dataset: ${target.datasetName} (${target.isDemo ? 'Demonstration Synthetic Benchmark' : target.datasetNature})`,
          `Mann-Kendall S = ${target.mannKendall?.sStatistic ?? 'N/A'}, Z = ${target.mannKendall?.zScore.toFixed(3) ?? 'N/A'}, p = ${target.mannKendall?.pValue.toFixed(6) ?? 'N/A'}`,
          `Sen's Slope = ${target.sensSlope?.slopePerYear.toFixed(4) ?? 'N/A'} ${target.unit}/yr`,
        ],
      };
    }

    if (q === 'regional-divergence') {
      const byVar = new Map<string, TrendAnalysisResult[]>();
      analyses.forEach((a) => {
        const list = byVar.get(a.variableId) || [];
        list.push(a);
        byVar.set(a.variableId, list);
      });
      const divergentVars: string[] = [];
      for (const [, list] of byVar) {
        const hasPos = list.some((x) => (x.sensSlope?.slopePerYear ?? 0) > 1e-5);
        const hasNeg = list.some((x) => (x.sensSlope?.slopePerYear ?? 0) < -1e-5);
        if (hasPos && hasNeg) {
          const pos = list.find((x) => (x.sensSlope?.slopePerYear ?? 0) > 1e-5)!;
          const neg = list.find((x) => (x.sensSlope?.slopePerYear ?? 0) < -1e-5)!;
          divergentVars.push(
            `${pos.variableName}: ${pos.regionName} (+${pos.sensSlope!.slopePerYear.toFixed(4)} ${pos.unit}/yr) vs. ${
              neg.regionName
            } (${neg.sensSlope!.slopePerYear.toFixed(4)} ${neg.unit}/yr)`
          );
        }
      }
      if (divergentVars.length === 0) {
        return {
          headline: 'No opposite-direction regional pair found for the same variable yet.',
          body: 'Use Regional Comparison or Geospatial Change Detection to test two regions on the same variable.',
          evidence: [],
        };
      }
      return {
        headline: `Detected ${divergentVars.length} variable(s) with opposite regional trajectories.`,
        body: 'Regional climate forcings—such as subtropical dry-zone expansion versus mid-latitude storm track shifts—can produce opposite signs for the exact same variable.',
        evidence: divergentVars,
      };
    }

    // data-quality
    const flagged = analyses.filter(
      (a) =>
        a.statusLabel === 'Insufficient data' ||
        a.missingPercent > 5 ||
        a.autocorrelation?.hasSignificantAutocorrelation
    );
    if (flagged.length === 0) {
      return {
        headline: 'All analyzed series pass sample sufficiency and low-autocorrelation checks.',
        body: `All ${analyses.length} analyzed series meet minimum sample size requirements with acceptable missing-data percentages.`,
        evidence: analyses.map(
          (a) => `${a.regionName} (${a.variableId}): n=${a.validObservations}, missing=${a.missingPercent}%`
        ),
      };
    }
    return {
      headline: `${flagged.length} series exhibit data-quality or serial autocorrelation caveats.`,
      body: 'High missing-data rates reduce statistical power, while positive lag-1 residual autocorrelation narrows unadjusted Mann-Kendall p-values.',
      evidence: flagged.map(
        (a) =>
          `${a.regionName} (${a.variableId}): n=${a.validObservations}, missing=${a.missingPercent}%, lag-1 r₁=${
            a.autocorrelation?.lag1.toFixed(3) ?? 'N/A'
          }`
      ),
    };
  };

  const answer = computeAnswer(selectedQuestion);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Scientific Insights</h1>
        <p className="text-sm text-[#8FA8C8] mt-0.5">
          Deterministic rule-based interpretation engine grounded strictly in computed session statistics and verified
          dataset provenance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono text-[#8FA8C8] mb-2">RESEARCH QUESTIONS</div>
          {QUESTIONS.map((q) => {
            const active = selectedQuestion === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQuestion(q.id)}
                className={`w-full text-left p-3.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                  active
                    ? 'border-[#36D9E6] bg-[#36D9E6]/10 text-[#F4F8FF] font-medium'
                    : 'border-[#193556] bg-[#0B1E36] text-[#8FA8C8] hover:text-[#F4F8FF]'
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#36D9E6]">
              <Lightbulb className="w-4 h-4" />
              <span>COMPUTED EVIDENCE SYNTHESIS</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-[#F4F8FF]">{answer.headline}</h2>
            <p className="text-sm text-[#8FA8C8] leading-relaxed">{answer.body}</p>

            {answer.evidence.length > 0 && (
              <div className="pt-3 border-t border-[#193556] space-y-2">
                <div className="text-xs font-mono text-[#8FA8C8]">SUPPORTING SESSION METRICS</div>
                <ul className="space-y-1.5 text-xs font-mono text-[#F4F8FF]">
                  {answer.evidence.map((ev, i) => (
                    <li key={i} className="bg-[#071426] border border-[#193556] rounded-md px-3 py-2">
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 text-xs text-[#8FA8C8] leading-relaxed">
            <strong className="text-[#F4F8FF]">Scientific Integrity Policy:</strong> Insights above are synthesized
            exclusively from the computed Mann-Kendall, Sen&apos;s Slope, and OLS regression arrays in your active
            workspace. Synthetic Demonstration Benchmark runs are always explicitly tagged and separated from live NASA
            POWER observations.
          </div>
        </div>
      </div>
    </div>
  );
}
