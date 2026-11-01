
import unittest

from prismlab.core.fusion import extract_direction


class TestP6Fusion(unittest.TestCase):

    def test_rightmost(self):
        self.assertEqual(
            extract_direction(
                "What color is the rightmost rectangle?"
            ),
            "rightmost",
        )

    def test_leftmost(self):
        self.assertEqual(
            extract_direction(
                "What color is the LEFTMOST rectangle?"
            ),
            "leftmost",
        )

    def test_spaced_rightmost(self):
        self.assertEqual(
            extract_direction("What color is the right most rectangle?"),
            "rightmost",
        )

    def test_hyphenated_rightmost(self):
        self.assertEqual(
            extract_direction("What color is the right-most rectangle?"),
            "rightmost",
        )

    def test_spaced_leftmost(self):
        self.assertEqual(
            extract_direction("Find the left most rectangle."),
            "leftmost",
        )

    def test_asr_corruption(self):
        self.assertIsNone(
            extract_direction(
                "What color is the rice most rectangular?"
            )
        )

    def test_conflicting_direction(self):
        self.assertIsNone(
            extract_direction("leftmost or rightmost?")
        )

    def test_missing_direction(self):
        self.assertIsNone(
            extract_direction("What color is the rectangle?")
        )


if __name__ == "__main__":
    unittest.main()
