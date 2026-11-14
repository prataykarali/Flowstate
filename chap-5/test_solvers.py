"""Regression tests; run: python -m unittest discover -s chap-5 -p 'test_*.py' -v"""

import math
import unittest
from dynamics import decay_dynamics, exact_decay, time_dynamics, exact_time
from solvers import euler_step, rk2_step, rk4_step, solve


class SolverTests(unittest.TestCase):
    def test_euler_decay(self):
        self.assertAlmostEqual(euler_step(decay_dynamics, 0, 1, .1), .8)
        self.assertAlmostEqual(solve(euler_step, decay_dynamics, .1, T=.2), .64)

    def test_rk2_decay(self):
        self.assertAlmostEqual(rk2_step(decay_dynamics, 0, 1, .1), .82)

    def test_rk4_decay(self):
        self.assertAlmostEqual(rk4_step(decay_dynamics, 0, 1, .1), .8187333333333333)

    def test_time_dependent_rk2(self):
        self.assertTrue(math.isclose(rk2_step(time_dynamics, 0, 0, 1), exact_time(1), abs_tol=1e-12))

    def test_time_dependent_rk4(self):
        self.assertTrue(math.isclose(rk4_step(time_dynamics, 0, 0, 1), exact_time(1), abs_tol=1e-12))

    def test_accuracy_order_on_decay(self):
        T = .2
        e1 = abs(solve(euler_step, decay_dynamics, .1, T) - exact_decay(T))
        r2 = abs(solve(rk2_step, decay_dynamics, .1, T) - exact_decay(T))
        r4 = abs(solve(rk4_step, decay_dynamics, .1, T) - exact_decay(T))
        self.assertGreater(e1, r2)
        self.assertGreater(r2, r4)

    def test_interval_guard(self):
        with self.assertRaises(ValueError):
            solve(euler_step, decay_dynamics, .06, T=.2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
