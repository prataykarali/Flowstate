"""Unit tests for PrismLab pipeline dispatch (offline / standard library)."""

import base64
import unittest
from unittest.mock import patch
from prismlab.core.pipeline import run_task

PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/"
    "Yj8AAAAASUVORK5CYII="
)


class TestPipeline(unittest.TestCase):
    def test_pipeline_text_dispatch(self):
        with patch("prismlab.core.pipeline.generate_text", return_value="Mocked text response") as mock_text:
            result = run_task("Explain attention", task="chat", inputs={"text"})
            self.assertEqual(result, "Mocked text response")
            mock_text.assert_called_once_with("Explain attention")

    def test_pipeline_vision_dispatch_bytes(self):
        with patch("prismlab.core.pipeline.generate_vision", return_value="Mocked vision response") as mock_vis:
            result = run_task(
                prompt="What is in the image?",
                task="chat",
                inputs={"text", "image"},
                image=PNG_BYTES,
                mime="image/png",
            )
            self.assertEqual(result, "Mocked vision response")
            self.assertTrue(mock_vis.called)
            payload = mock_vis.call_args[0][0]
            self.assertEqual(payload["model"], "lfm3-vision")
            self.assertEqual(payload["messages"][0]["content"][1]["text"], "What is in the image?")

    def test_pipeline_vision_missing_image(self):
        with self.assertRaises(ValueError):
            run_task("What is here?", task="chat", inputs={"text", "image"})

    def test_pipeline_unimplemented_modality(self):
        with self.assertRaises(NotImplementedError):
            run_task("Listen to audio", task="chat", inputs={"audio"})

    def test_pipeline_empty_inputs(self):
        with self.assertRaises(ValueError):
            run_task("Hello", task="chat", inputs=set())


if __name__ == "__main__":
    unittest.main()
