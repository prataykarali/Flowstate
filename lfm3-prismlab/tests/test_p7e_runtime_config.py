import os
import unittest
import tempfile
from unittest.mock import patch

from pathlib import Path

from prismlab.runtime_config import TextRuntimeConfig, acceleration_flags


class RuntimeConfigTests(unittest.TestCase):
    @patch.dict(os.environ, {"PRISMLAB_GPU_LAYERS": "0"})
    def test_explicit_cpu_override_keeps_cpu_flags(self):
        self.assertIn("--device", acceleration_flags(Path("/tmp/build-cuda/llama-server")))

    @patch.dict(os.environ, {"PRISMLAB_GPU_LAYERS": "99"})
    def test_explicit_gpu_layers_enable_offload(self):
        self.assertEqual(acceleration_flags(Path("/tmp/llama-server")), ("-ngl", "99"))

    @patch.dict(os.environ, {"PRISMLAB_TEXT_HOST_MODE": "remote", "PRISMLAB_TEXT_ROUTER_URL": "https://cpu.example.test:443", "PRISMLAB_TEXT_RUNTIME_API_KEY": "private-test-key"})
    def test_remote_runtime_requires_https_and_keeps_key_server_side(self):
        config = TextRuntimeConfig.from_env()
        spec = config.runtime_spec()
        self.assertTrue(spec.allow_remote)
        self.assertEqual(spec.model_id, "lfm3-1.7b")
        self.assertIsNone(spec.launch_command)
        self.assertEqual(spec.auth_token, "private-test-key")

    @patch.dict(os.environ, {"PRISMLAB_TEXT_HOST_MODE": "remote", "PRISMLAB_TEXT_ROUTER_URL": "http://cpu.example.test:8080", "PRISMLAB_TEXT_RUNTIME_API_KEY": "private-test-key"})
    def test_remote_http_rejected(self):
        with self.assertRaises(ValueError):
            TextRuntimeConfig.from_env()

    @patch.dict(os.environ, {"PRISMLAB_TEXT_HOST_MODE": "remote", "PRISMLAB_TEXT_ROUTER_URL": "https://cpu.example.test:443", "PRISMLAB_TEXT_RUNTIME_API_KEY": ""})
    def test_remote_key_required(self):
        with self.assertRaises(ValueError):
            TextRuntimeConfig.from_env()

    @patch.dict(os.environ, {"PRISMLAB_TEXT_MAX_CONCURRENCY": "2"})
    def test_unimplemented_concurrency_rejected(self):
        with self.assertRaises(ValueError):
            TextRuntimeConfig.from_env()

    @patch.dict(os.environ, {"PRISMLAB_TEXT_ROUTER_URL": "http://127.0.0.1:8080", "PRISMLAB_ROUTER_URL": "http://127.0.0.1:8188", "PRISMLAB_TEXT_MODEL_ALIAS": "lfm3-1.7b"})
    def test_text_url_overrides_legacy_router_url(self):
        with tempfile.TemporaryDirectory() as directory:
            binary = Path(directory) / "llama-server"
            model = Path(directory) / "LFM3-1.7B-Q4_K_M.gguf"
            binary.touch()
            model.touch()
            with patch.dict(os.environ, {"PRISMLAB_LLAMA_SERVER": str(binary), "PRISMLAB_MODEL_DIR": directory}):
                config = TextRuntimeConfig.from_env()
                self.assertEqual(config.base_url, "http://127.0.0.1:8080")
                self.assertIn("lfm3-1.7b", config.runtime_spec().launch_command)


if __name__ == "__main__":
    unittest.main()
