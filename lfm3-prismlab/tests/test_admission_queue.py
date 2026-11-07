import asyncio
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from prismlab.admission_queue import AdmissionQueue
from prismlab import public_gateway


class AdmissionQueueTests(unittest.IsolatedAsyncioTestCase):
    async def test_fifo_capacity_and_per_visitor_limit(self):
        queue = AdmissionQueue(waiting_limit=2, per_visitor_limit=1)
        first = await queue.admit("a")
        second = await queue.admit("b")
        third = await queue.admit("c")
        self.assertEqual(await queue.position(third), 2)
        with self.assertRaises(HTTPException) as full:
            await queue.admit("d")
        self.assertEqual(full.exception.status_code, 503)
        with self.assertRaises(HTTPException) as duplicate:
            await queue.admit("b")
        self.assertEqual(duplicate.exception.status_code, 429)
        await queue.release(first)
        self.assertTrue(second.ready.is_set())
        await queue.release(second)
        self.assertTrue(third.ready.is_set())
        await queue.release(third)
        with self.assertRaises(HTTPException) as rate:
            await queue.admit("a")
        self.assertEqual(rate.exception.status_code, 429)

    async def test_waiting_cancellation_preserves_order(self):
        queue = AdmissionQueue(waiting_limit=2)
        first = await queue.admit("a")
        cancelled = await queue.admit("b")
        next_ticket = await queue.admit("c")
        await queue.release(cancelled)
        await queue.release(first)
        self.assertTrue(next_ticket.ready.is_set())
        self.assertEqual(await queue.snapshot(), {"active": 1, "waiting": 0, "waiting_limit": 2})
        await queue.release(next_ticket)

    async def test_ten_simultaneous_visitors_have_two_retry_responses(self):
        queue = AdmissionQueue(waiting_limit=7)
        admitted = []
        rejected = 0
        for index in range(10):
            try:
                admitted.append(await queue.admit(f"visitor-{index}"))
            except HTTPException as exc:
                self.assertEqual(exc.status_code, 503)
                rejected += 1
        self.assertEqual((len(admitted), rejected), (8, 2))
        for ticket in admitted:
            await queue.release(ticket)


class SpaceAppTests(unittest.TestCase):
    def setUp(self):
        self.original_queue = public_gateway.queue
        public_gateway.queue = AdmissionQueue(waiting_limit=1, per_visitor_limit=2)
        self.client = TestClient(public_gateway.app)

    def tearDown(self):
        self.client.close()
        public_gateway.queue = self.original_queue

    @patch("prismlab.public_gateway.available_routes", return_value=["text"])
    def test_status_issues_visitor_cookie(self, _):
        response = self.client.get("/local-api/status")
        self.assertEqual(response.status_code, 200)
        self.assertIn("prismlab_visitor", response.cookies)
        self.assertEqual(response.json()["queue"]["waiting_limit"], 1)

    def test_health_and_readiness_reflect_model_availability(self):
        self.assertEqual(self.client.get("/healthz").json(), {"status": "ok"})
        with patch("prismlab.public_gateway.available_routes", return_value=[]):
            self.assertEqual(self.client.get("/readyz").status_code, 503)
        with patch("prismlab.public_gateway.available_routes", return_value=["text"]):
            response = self.client.get("/readyz")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["available_routes"], ["text"])

    @patch("prismlab.public_gateway._run_text", return_value={"mode": "live_local_inference", "status": "completed", "output": "Hello"})
    def test_text_rate_limit_and_input_validation(self, mock_run):
        self.client.get("/local-api/status")
        self.assertEqual(self.client.post("/local-api/text", json={"prompt": "hello"}).status_code, 200)
        self.assertEqual(self.client.post("/local-api/text", json={"prompt": "again"}).status_code, 200)
        self.assertEqual(self.client.post("/local-api/text", json={"prompt": "third"}).status_code, 429)
        self.assertEqual(self.client.post("/local-api/text", json={"prompt": "x" * 1001}).status_code, 422)
        self.assertEqual(mock_run.call_count, 2)

    @patch("prismlab.public_gateway._run_text")
    def test_stream_keeps_result_contract(self, mock_run):
        def run(prompt, on_token, max_tokens):
            on_token("<think>")
            on_token("private reasoning")
            on_token("</think>")
            on_token("Hello")
            return {"mode": "live_local_inference", "status": "completed", "output": "Hello"}
        mock_run.side_effect = run
        response = self.client.post("/local-api/text/stream", json={"prompt": "hi"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("event: token", response.text)
        self.assertIn("event: result", response.text)
        self.assertNotIn("private reasoning", response.text)

    @patch("prismlab.public_gateway.available_routes", return_value=["text"])
    @patch("prismlab.public_gateway.run_local")
    def test_playground_execute_stream_uses_existing_parser(self, mock_run, _):
        def run(task, prompt, media, selected, model, decision_question, max_tokens, on_token):
            self.assertEqual((task, prompt, model), ("chat", "hello", "text"))
            self.assertEqual(media, {})
            on_token("Reply")
            return {"mode": "live_local_inference", "status": "completed", "output": "Reply"}
        mock_run.side_effect = run
        response = self.client.post("/local-api/execute/stream", json={"task": "chat", "prompt": "hello", "model": "text"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("event: token", response.text)
        self.assertIn("event: result", response.text)

    @patch("prismlab.public_gateway.available_routes", return_value=["text"])
    def test_uninstalled_model_is_rejected_before_queue(self, _):
        response = self.client.post("/local-api/execute/stream", json={"task": "chat", "prompt": "hello", "model": "vision"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("not installed", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
