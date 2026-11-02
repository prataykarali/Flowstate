import importlib.util
import json
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'experiments/p7/p7_1_architecture_audit.py'
spec = importlib.util.spec_from_file_location('p7_audit', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ConfigAuditTests(unittest.TestCase):
    def test_all_six_distinct(self):
        self.assertEqual(len(module.MODELS), 6)
        self.assertEqual(len(set(module.MODELS.values())), 6)

    def test_nested_observations_no_inventions(self):
        fake = {"model_type":"example", "text_config":{"hidden_size":1024,"num_hidden_layers":2},
                "other":{"unrelated":"skip"}, "layer_types":["conv", "attention"]}
        obs = module.extract_fields(fake)
        self.assertEqual(obs['text_config.hidden_size'], 1024)
        self.assertEqual(obs['layer_types']['list_length'], 2)
        self.assertNotIn('other.unrelated', obs)
        self.assertNotIn('global_attention_count', obs)

    def test_url(self):
        self.assertEqual(module.config_url('LiquidAI/d1-Omni-2B'),
                         'https://huggingface.co/LiquidAI/d1-Omni-2B/resolve/main/config.json')

if __name__ == '__main__':
    unittest.main()
