"""
Performance comparison report generator.

This script can be run to generate a comprehensive performance report
comparing FastAPI vs Django REST Framework (if both are available).
"""

import time
import statistics
from typing import Dict
import requests
import json
from datetime import datetime


class PerformanceReporter:
    def __init__(
        self, fastapi_url: str = "http://localhost:8000", drf_url: str = ""
    ):
        self.fastapi_url = fastapi_url
        self.drf_url = drf_url or fastapi_url
        self.results = {}

    def benchmark_endpoint(
        self, name: str, endpoint: str, payload: dict, iterations: int = 10
    ) -> Dict:
        """Benchmark an endpoint and return statistics"""
        times = []
        successful = 0
        failed = 0

        # Test FastAPI
        print(f"\nBenchmarking {name}...")
        for i in range(iterations):
            try:
                start = time.perf_counter()
                response = requests.post(
                    f"{self.fastapi_url}{endpoint}", json=payload, timeout=10
                )
                end = time.perf_counter()

                if response.status_code == 200:
                    times.append((end - start) * 1000)  # Convert to ms
                    successful += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"  Error on request {i}: {e}")
                failed += 1

        if times:
            stats = {
                "name": name,
                "endpoint": endpoint,
                "iterations": iterations,
                "successful": successful,
                "failed": failed,
                "avg_ms": statistics.mean(times),
                "min_ms": min(times),
                "max_ms": max(times),
                "stdev_ms": statistics.stdev(times) if len(times) > 1 else 0,
                "throughput": successful / sum(times) * 1000,  # req/s
            }
        else:
            stats = {
                "name": name,
                "endpoint": endpoint,
                "iterations": iterations,
                "successful": 0,
                "failed": failed,
                "error": "All requests failed",
            }

        self.results[name] = stats
        return stats

    def print_report(self):
        """Print a formatted performance report"""
        print("\n" + "=" * 80)
        print("PERFORMANCE BENCHMARK REPORT")
        print("=" * 80)
        print(f"Generated: {datetime.now().isoformat()}")
        print(f"FastAPI URL: {self.fastapi_url}")
        print("=" * 80)

        for name, stats in self.results.items():
            print(f"\n{name}:")
            if "error" in stats:
                print(f"  Error: {stats['error']}")
            else:
                print(f"  Average: {stats['avg_ms']:.2f}ms")
                print(f"  Min: {stats['min_ms']:.2f}ms")
                print(f"  Max: {stats['max_ms']:.2f}ms")
                print(f"  StdDev: {stats['stdev_ms']:.2f}ms")
                print(f"  Throughput: {stats['throughput']:.2f} req/s")
                print(f"  Success: {stats['successful']}/{stats['iterations']}")

        print("\n" + "=" * 80)

    def save_json_report(self, filename: str = "performance_report.json"):
        """Save results to JSON file"""
        with open(filename, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"\nResults saved to {filename}")


if __name__ == "__main__":
    # Run benchmark
    reporter = PerformanceReporter()

    # Benchmark endpoints
    reporter.benchmark_endpoint(
        "/mary", "/mary", {"tonic": "C", "octave": 4}, iterations=20
    )

    reporter.benchmark_endpoint(
        "/random",
        "/random",
        {"rhythm": "1111", "rhythmType": 16, "tonic": "C"},
        iterations=20,
    )

    reporter.benchmark_endpoint(
        "/note-game", "/note-game", {"scale": "C", "octave": "4"}, iterations=20
    )

    # Print and save report
    reporter.print_report()
    reporter.save_json_report()
