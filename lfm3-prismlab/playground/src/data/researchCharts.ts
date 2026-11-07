export interface ResearchChart {
  id: string;
  phase: string;
  title: string;
  measure: string;
  unit: string;
  max: number;
  lowerIsBetter: boolean;
  sourcePath: string;
  note: string;
  bars: { label: string; value: number; sample: string }[];
}
export const RESEARCH_CHARTS: ResearchChart[] = [
  { id: 'p2-ocr', phase: 'P2', title: 'Synthetic document exact match', measure: 'Exact-match cases in the same 10-document set', unit: '/10', max: 10, lowerIsBetter: false, sourcePath: 'docs/p2/README.md', note: 'Synthetic documents. A ten-case result does not establish field OCR accuracy.', bars: [{ label: 'Direct VL', value: 10, sample: 'n=10' }, { label: 'Modular', value: 9, sample: 'n=10' }] },
  { id: 'p2-latency', phase: 'P2', title: 'Document QA total latency', measure: 'Median seconds in the same P2 setup', unit: 's', max: 75, lowerIsBetter: true, sourcePath: 'docs/p2/README.md', note: 'Phase-local medians under the documented CPU setup; lower is faster.', bars: [{ label: 'Direct VL', value: 38.53, sample: 'P2 median' }, { label: 'Modular', value: 65.72, sample: 'P2 median' }] },
  { id: 'p3-success', phase: 'P3', title: 'Speech task strict success', measure: 'Successful tasks out of 25 synthetic cases', unit: '/25', max: 25, lowerIsBetter: false, sourcePath: 'docs/p3/README.md', note: 'Strict task success, not general speech quality. Both routes were tested on the same 25 cases.', bars: [{ label: 'Native S2S', value: 24, sample: 'n=25' }, { label: 'Modular V2.1', value: 22, sample: 'n=25' }] },
  { id: 'p3-latency', phase: 'P3', title: 'Speech end-to-end latency', measure: 'Median seconds among timed runs', unit: 's', max: 25, lowerIsBetter: true, sourcePath: 'docs/p3/README.md', note: 'Different timed-run counts: native n=23, modular n=24. Lower is faster.', bars: [{ label: 'Native S2S', value: 13.95, sample: 'n=23 timed' }, { label: 'Modular V2.1', value: 20.18, sample: 'n=24 timed' }] },
  { id: 'p4-matched', phase: 'P4', title: 'Matched multimodal cases', measure: 'Correct cases in a paired 40-case evaluation', unit: '/40', max: 40, lowerIsBetter: false, sourcePath: 'docs/p4/P4_FINAL_REPORT.md', note: 'The observed difference was not statistically significant: exact McNemar p=0.25.', bars: [{ label: 'Native Omni', value: 25, sample: 'n=40 paired' }, { label: 'Modular ASR → VL', value: 28, sample: 'n=40 paired' }] },
];
