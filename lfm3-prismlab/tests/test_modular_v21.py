"""Offline checks; no model servers required."""
from __future__ import annotations
import importlib.util
import json
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / 'experiments/p3/modular_v21.py'
spec = importlib.util.spec_from_file_location('prismlab_modular_v2', MODULE_PATH)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ModularV2Tests(unittest.TestCase):
    def make_wav(self, path: Path, rate=16000, signal=True):
        import math
        import struct
        frames = b''.join(struct.pack('<h', int(0.15 * 32767 *
                            math.sin(2 * math.pi * 200 * i / rate)) if signal else 0)
                          for i in range(rate // 5))
        with wave.open(str(path), 'wb') as wf:
            wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(rate)
            wf.writeframes(frames)

    def test_audio_input_checks(self):
        with tempfile.TemporaryDirectory() as d:
            good = Path(d) / 'good.wav'; self.make_wav(good)
            info = m.pcm16_wav_info(good)
            self.assertEqual(info['sample_rate'], 16000)
            bad = Path(d) / 'bad.wav'; self.make_wav(bad, rate=24000)
            with self.assertRaises(ValueError): m.pcm16_wav_info(bad)
            silent = Path(d) / 'silent.wav'; self.make_wav(silent, signal=False)
            with self.assertRaises(ValueError): m.pcm16_wav_info(silent)

    def test_text_only_and_trace(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(m, 'reason', return_value=('The red cube is near the blue box.',
                        {'finish_reason': 'stop', 'usage': {'completion_tokens': 12}})):
                r = m.run(transcript='The red cube is near the blue box. Where is it?',
                          output_root=Path(d), case_id='S01')
            self.assertEqual(r['status'], 'ok')
            self.assertEqual(r['mode'], 'text_only')
            self.assertFalse(r['response_length_violation'])
            self.assertEqual(json.loads((Path(r['run_directory'])/'report.json').read_text())['answer'],
                             'The red cube is near the blue box.')

    def test_full_audio_stages(self):
        with tempfile.TemporaryDirectory() as d:
            source = Path(d)/'input.wav'; self.make_wav(source)
            output_wav = Path(d)/'synth.wav'; self.make_wav(output_wav, rate=24000)
            with patch.object(m, 'asr', return_value=('What is nine times seven?', {'finish_reason':'stop'})), \
                 patch.object(m, 'reason', return_value=('63.', {'finish_reason':'stop'})), \
                 patch.object(m, 'synthesize', return_value=output_wav.read_bytes()):
                r = m.run(wav_path=source, output_root=Path(d)/'reports', case_id='F03')
            self.assertEqual(r['status'], 'ok')
            self.assertEqual(r['answer'], '63.')
            self.assertIn('tts', r['stages'])
            self.assertTrue(Path(r['stages']['tts']['output']).exists())

    def test_failed_run_is_recorded(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(m, 'reason', side_effect=RuntimeError('server unavailable')):
                with self.assertRaises(RuntimeError):
                    m.run(transcript='hello', output_root=Path(d), case_id='failure')
            reports = list(Path(d).rglob('report.json'))
            self.assertEqual(len(reports), 1)
            self.assertEqual(json.loads(reports[0].read_text())['status'], 'failed')


    def test_strip_think_text(self):
        raw = 'Planning answer carefully.</think> The red cube is near the blue box.'
        answer, changed = m.clean_voice_answer(raw)
        self.assertEqual(answer, 'The red cube is near the blue box.')
        self.assertTrue(changed)
        with self.assertRaises(ValueError):
            m.clean_voice_answer('<think>unfinished reasoning')
        with self.assertRaises(ValueError):
            m.clean_voice_answer('<think>thought</think>')

    def test_full_pipeline_refuses_oversized_tts(self):
        with tempfile.TemporaryDirectory() as d:
            source = Path(d)/'input.wav'; self.make_wav(source)
            long_answer = ' '.join(['extra'] * 26)
            with patch.object(m, 'asr', return_value=('Test?', {'finish_reason': 'stop'})), \
                 patch.object(m, 'reason', return_value=(long_answer, {'finish_reason': 'stop'})), \
                 patch.object(m, 'synthesize') as fake_tts:
                with self.assertRaisesRegex(ValueError, 'limit 25'):
                    m.run(wav_path=source, output_root=Path(d)/'reports', case_id='long')
                fake_tts.assert_not_called()
            reports = list((Path(d)/'reports').rglob('report.json'))
            self.assertEqual(json.loads(reports[0].read_text())['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
