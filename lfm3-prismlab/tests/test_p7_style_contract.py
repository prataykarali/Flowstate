import unittest
from pathlib import Path
from collections import Counter
BASE = Path(__file__).resolve().parents[1]

class P7StyleContractTests(unittest.TestCase):
    def test_original_palette_and_svg_symbols_are_retained(self):
        original=(BASE/'visuals/PrismLabs_Architecture_Extended_P6_ORIGINAL.html').read_text()
        enhanced=(BASE/'visuals/PrismLabs_Architecture_Extended_P7.html').read_text()
        atlas=(BASE/'visuals/PrismLabs_Model_Atlas.html').read_text()
        for key in ('--mint:#52efd0','--blue:#67baff','--pink:#d6a0ff','--background:#070d19',
                    'id="mintGlow"','id="softShadow"','id="ico-layers"','id="background"',
                    'id="dots"'):
            for doc in (original,enhanced,atlas): self.assertIn(key,doc)
    def test_overview_keeps_three_original_flows(self):
        orig=(BASE/'visuals/PrismLabs_Architecture_Extended_P6_ORIGINAL.html').read_text()
        enh=(BASE/'visuals/PrismLabs_Architecture_Extended_P7.html').read_text()
        for flow in ('data-flow="doc"','data-flow="voice"','data-flow="decision"'):
            self.assertIn(flow,orig);self.assertIn(flow,enh)
        for m in ('text','vision','audio','omni','d1','d1omni'):
            self.assertIn('data-model="'+m+'"',enh)
        self.assertIn('PrismLabs_Model_Atlas.html#',enh)
    def test_24_layers_schedule_is_valid(self):
        seq=['full_attention' if i%4==2 else 'sliding_attention' if i%4==0 and i>0 else 'conv' for i in range(24)]
        self.assertEqual(Counter(seq),Counter({'conv':13,'sliding_attention':5,'full_attention':6}))
        mm=(BASE/'visuals/mermaid/p7_lfm3_text.mmd').read_text()
        for n in range(24): self.assertIn(f'L{n:02d}["Layer {n+1:02d}',mm)
    def test_atlas_controls_and_no_model_weights(self):
        html=(BASE/'visuals/PrismLabs_Model_Atlas.html').read_text()
        for t in ('atlas-play','atlas-step','atlas-reset','pending-view','text-view','prefers-reduced-motion'):
            self.assertIn(t,html)
        self.assertNotIn('llama-server',html)

if __name__=='__main__': unittest.main()
